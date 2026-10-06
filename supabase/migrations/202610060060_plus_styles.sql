-- Ball and card styles, saved per user. Only the billing service writes them, and only an active Plus may choose a
-- non-classic style. A lapsed subscription keeps the saved choice; the app renders Classic until Plus returns.
alter table public.social_profiles
 add column ball_style text not null default 'classic' check(ball_style in ('classic','gold','obsidian')),
 add column card_style text not null default 'classic' check(card_style in ('classic','gold','obsidian'));

create or replace function public.reading_balance(viewer uuid) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
 begin
 insert into public.social_profiles(user_id) values(viewer) on conflict do nothing;
 perform 1 from public.social_profiles where user_id=viewer for update;
 return (select jsonb_build_object(
  'owner',viewer,
  'asOf',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'plus',coalesce(p.plus_until>now(),false),
  'plusUntil',p.plus_until,
  'packs',coalesce(p.packs,0),
  'used',(select count(*) from public.reading_charges c where c.user_id=viewer and c.day=(now() at time zone 'UTC')::date),
  'day',(now() at time zone 'UTC')::date,
  'ballStyle',p.ball_style,
  'cardStyle',p.card_style)
 from public.social_profiles p where p.user_id=viewer);
 end;
$$;

create function public.set_profile_styles(viewer uuid,ball text,card text) returns jsonb
 language plpgsql security definer set search_path='' as $$
 declare is_plus boolean;
 begin
  insert into public.social_profiles(user_id) values(viewer) on conflict do nothing;
  select coalesce(plus_until>now(),false) into is_plus from public.social_profiles where user_id=viewer for update;
  if not is_plus and (ball<>'classic' or card<>'classic') then raise exception 'Ball and card styles are a Plus extra'; end if;
  update public.social_profiles set ball_style=ball,card_style=card where user_id=viewer;
  return public.reading_balance(viewer);
 end;
$$;
revoke all on function public.set_profile_styles(uuid,text,text) from public,anon,authenticated;
grant execute on function public.set_profile_styles(uuid,text,text) to service_role;
