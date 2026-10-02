-- Only the trusted moderation service writes drafts; clients publish approved receipts.
create table public.social_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 age_band text not null default 'unknown' check (age_band in ('unknown','teen','adult')),
 sun_sign text check (sun_sign in ('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces')),
 friends_can_ask boolean not null default false,
 plus boolean not null default false,
 check (not friends_can_ask or age_band='adult')
);
create table public.social_drafts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('star','seal')),
 wording text not null check (length(wording) between 4 and 160),
 theme text not null check (theme in ('love','work','moving','learning','growth','money')),
 expires_at timestamptz not null default now()+interval '15 minutes'
);
create table public.social_blocks (
 user_id uuid not null references auth.users(id) on delete cascade,
 blocked_id uuid not null references auth.users(id) on delete cascade,
 primary key(user_id,blocked_id), check(user_id<>blocked_id)
);
create table public.sky_stars (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 theme text not null check (theme in ('love','work','moving','learning','growth','money')),
 wording text not null check (length(wording) between 4 and 160),
 draft_id uuid not null references public.social_drafts(id),
 withdrawn boolean not null default false,
 day date not null default (now() at time zone 'UTC')::date,
 unique(user_id, day)
);
create table public.star_reports (
 star_id uuid not null references public.sky_stars(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(star_id,user_id)
);
create table public.sky_resonances (
 star_id uuid not null references public.sky_stars(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(star_id,user_id)
);
create table public.circles (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade
);
create table public.circle_members (
 circle_id uuid not null references public.circles(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),
 consulted_on date,
 theme text check (theme in ('love','work','moving','learning','growth','money')),
 primary key(circle_id,user_id)
);
create table public.circle_invites (
 token uuid primary key default gen_random_uuid(),
 circle_id uuid not null references public.circles(id) on delete cascade,
 expires_at timestamptz not null default now() + interval '7 days'
);
create table public.circle_reactions (
 circle_id uuid not null,
 target_id uuid not null,
 user_id uuid not null,
 day date not null default (now() at time zone 'UTC')::date,
 primary key(circle_id,target_id,user_id,day),
 foreign key(circle_id,target_id) references public.circle_members(circle_id,user_id) on delete cascade,
 foreign key(circle_id,user_id) references public.circle_members(circle_id,user_id) on delete cascade
);
create table public.friend_notices (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null default (now() at time zone 'UTC')::date,
 seen boolean not null default false
);
create table public.sealed_forecasts (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid references auth.users(id) on delete cascade,
 token uuid not null unique default gen_random_uuid(),
 headline text not null check (length(headline) between 1 and 160),
 opened_at timestamptz,
 created_at timestamptz not null default now(),
 revoked boolean not null default false,
 check ((recipient_id is null) = (opened_at is null)),
 check (sender_id is distinct from recipient_id)
);

alter table public.social_profiles enable row level security;
alter table public.social_drafts enable row level security;
alter table public.social_blocks enable row level security;
alter table public.star_reports enable row level security;
alter table public.friend_notices enable row level security;
revoke all on public.social_profiles,public.social_drafts,public.social_blocks,public.star_reports,public.friend_notices from public,anon,authenticated;
grant select on public.social_profiles,public.friend_notices to authenticated;
grant select,insert,update on public.social_profiles,public.social_drafts to service_role;
create policy own_social_profile on public.social_profiles for select to authenticated using(user_id=(select auth.uid()));
create policy own_friend_notices on public.friend_notices for select to authenticated using(user_id=(select auth.uid()));
alter table public.sky_stars enable row level security;
alter table public.sky_resonances enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_invites enable row level security;
alter table public.circle_reactions enable row level security;
alter table public.sealed_forecasts enable row level security;
revoke all on public.sky_stars,public.sky_resonances,public.circles,public.circle_members,public.circle_invites,public.circle_reactions,public.sealed_forecasts from public,anon,authenticated;

create schema if not exists social_private;
revoke all on schema social_private from public;
grant usage on schema social_private to authenticated;
create function social_private.member(target uuid) returns boolean
 language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.circle_members where circle_id=target and user_id=(select auth.uid()));
$$;
revoke all on function social_private.member(uuid) from public, anon;
grant execute on function social_private.member(uuid) to authenticated;

create policy own_stars on public.sky_stars for select to authenticated using (user_id=(select auth.uid()));
create policy own_resonance on public.sky_resonances for select to authenticated using (user_id=(select auth.uid()));
create policy member_circles on public.circles for select to authenticated using (social_private.member(id));
create policy member_list on public.circle_members for select to authenticated using (social_private.member(circle_id));
create policy sender_seals on public.sealed_forecasts for select to authenticated using (sender_id=(select auth.uid()));
grant select on public.sky_stars to authenticated;
grant select on public.sealed_forecasts to authenticated;
grant select on public.sky_resonances, public.circles, public.circle_members, public.circle_reactions to authenticated;
-- All inserts/updates go through narrowly scoped functions. No direct write grants.

create function social_private.blocked(person uuid) returns boolean
 language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.social_blocks where (user_id=auth.uid() and blocked_id=person) or (blocked_id=auth.uid() and user_id=person));
$$;
revoke all on function social_private.blocked(uuid) from public,anon;
grant execute on function social_private.blocked(uuid) to authenticated;
create policy member_reactions on public.circle_reactions for select to authenticated using (social_private.member(circle_id) and not social_private.blocked(user_id) and not social_private.blocked(target_id));
drop policy member_list on public.circle_members;
create policy member_list on public.circle_members for select to authenticated using(social_private.member(circle_id) and not social_private.blocked(user_id));
create function public.tonights_sky() returns table(id uuid,theme text,wording text,resonances bigint,resonated boolean,mine boolean)
 language sql stable security definer set search_path = '' as $$
 select s.id,s.theme,s.wording,count(r.user_id),coalesce(bool_or(r.user_id=auth.uid()),false),s.user_id=auth.uid()
 from public.sky_stars s left join public.sky_resonances r on r.star_id=s.id
 and not exists(select 1 from public.social_blocks b where (b.user_id=s.user_id and b.blocked_id=r.user_id) or (b.blocked_id=s.user_id and b.user_id=r.user_id))
 where auth.uid() is not null and s.day=(now() at time zone 'UTC')::date
 and not s.withdrawn and not social_private.blocked(s.user_id)
 and (select count(*) from public.star_reports reports where star_id=s.id
 and not exists(select 1 from public.social_blocks b where (b.user_id=s.user_id and b.blocked_id=reports.user_id) or (b.blocked_id=s.user_id and b.user_id=reports.user_id)))<3
 group by s.id order by s.id limit 200;
$$;
create function public.publish_star(approved_draft uuid) returns uuid
 language plpgsql security definer set search_path = '' as $$
 declare result uuid; draft public.social_drafts;
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  select * into draft from public.social_drafts where id=approved_draft and user_id=auth.uid() and kind='star' and expires_at>now();
  if draft.id is null then raise exception 'Approve a fresh anonymous draft first'; end if;
  insert into public.sky_stars(user_id,theme,wording,draft_id) values(auth.uid(),draft.theme,draft.wording,draft.id)
   returning id into result;
  return result;
 end;
$$;
create function public.resonate(star uuid) returns void
 language plpgsql security definer set search_path = '' as $$
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  if not exists(select 1 from public.sky_stars where id=star and day=(now() at time zone 'UTC')::date and not social_private.blocked(user_id)) then raise exception 'This star has faded'; end if;
  insert into public.sky_resonances values(star,auth.uid()) on conflict do nothing;
 end;
$$;
create function public.create_circle() returns uuid
 language plpgsql security definer set search_path = '' as $$
 declare result uuid;
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  insert into public.circles(owner_id) values(auth.uid()) returning id into result;
  insert into public.circle_members(circle_id,user_id) values(result,auth.uid());
  return result;
 end;
$$;
create function public.invite_to_circle(target uuid) returns uuid
 language plpgsql security definer set search_path = '' as $$
 declare result uuid;
 begin
  if not exists(select 1 from public.circles where id=target and owner_id=auth.uid()) then raise exception 'Only the circle creator can invite'; end if;
  insert into public.circle_invites(circle_id) values(target) returning token into result;
  return result;
 end;
$$;
create function public.join_circle(invite uuid) returns uuid
 language plpgsql security definer set search_path = '' as $$
 declare target uuid;
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  select circle_id into target from public.circle_invites where token=invite and expires_at>now() for update;
  if target is null then raise exception 'This invitation has expired or was used'; end if;
  perform 1 from public.circles where id=target for update;
  if social_private.member(target) then raise exception 'You already belong to this circle'; end if;
  if exists(select 1 from public.circle_members where circle_id=target and social_private.blocked(user_id)) then raise exception 'This invitation is unavailable'; end if;
  if (select count(*) from public.circle_members where circle_id=target)>=20 then raise exception 'This circle is full'; end if;
  insert into public.circle_members(circle_id,user_id) values(target,auth.uid());
  delete from public.circle_invites where token=invite;
  return target;
 end;
$$;
create function public.leave_circle(target uuid) returns void
 language plpgsql security definer set search_path = '' as $$
 begin
  -- The creator closes the circle; other members only remove themselves.
  delete from public.circles where id=target and owner_id=auth.uid();
  delete from public.circle_members where circle_id=target and user_id=auth.uid();
 end;
$$;
create function public.circle_checkin(activity_theme text) returns void
 language sql security definer set search_path = '' as $$
 update public.circle_members set consulted_on=(now() at time zone 'UTC')::date,theme=activity_theme where user_id=auth.uid();
$$;
create function public.react_in_circle(target_circle uuid,target_member uuid) returns void
 language plpgsql security definer set search_path = '' as $$
 begin
  if social_private.blocked(target_member) or not social_private.member(target_circle) then raise exception 'Join this circle first'; end if;
  if not exists(select 1 from public.circle_members where circle_id=target_circle and user_id=target_member and consulted_on=(now() at time zone 'UTC')::date) then raise exception 'No consultation today'; end if;
  insert into public.circle_reactions(circle_id,target_id,user_id) values(target_circle,target_member,auth.uid()) on conflict do nothing;
 end;
$$;
create function public.seal_forecast(approved_draft uuid) returns uuid
 language plpgsql security definer set search_path = '' as $$
 declare result uuid; draft public.social_drafts; is_plus boolean;
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  insert into public.social_profiles(user_id) values(auth.uid()) on conflict do nothing;
  select plus into is_plus from public.social_profiles where user_id=auth.uid() for update;
  select * into draft from public.social_drafts where id=approved_draft and user_id=auth.uid() and kind='seal' and expires_at>now();
  if draft.id is null then raise exception 'Approve a fresh sealed draft first'; end if;
  if not is_plus and (select count(*) from public.sealed_forecasts where sender_id=auth.uid() and created_at>=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC')>=1 then raise exception 'Your free seal is used this week. Plus has unlimited seals'; end if;
  insert into public.sealed_forecasts(sender_id,headline) values(auth.uid(),draft.wording) returning token into result;
  return result;
 end;
$$;
create function public.open_forecast(seal uuid) returns text
 language plpgsql security definer set search_path = '' as $$
 declare card public.sealed_forecasts;
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  select * into card from public.sealed_forecasts where token=seal and not revoked for update;
  if card.id is null or social_private.blocked(card.sender_id) or card.sender_id=auth.uid() or (card.recipient_id is not null and card.recipient_id<>auth.uid()) then raise exception 'This seal is unavailable'; end if;
  update public.sealed_forecasts set recipient_id=auth.uid(),opened_at=coalesce(opened_at,now()) where id=card.id;
  return card.headline;
 end;
$$;

revoke all on function public.tonights_sky(),public.publish_star(uuid),public.resonate(uuid),public.create_circle(),public.invite_to_circle(uuid),public.join_circle(uuid),public.leave_circle(uuid),public.circle_checkin(text),public.react_in_circle(uuid,uuid),public.seal_forecast(uuid),public.open_forecast(uuid) from public,anon;
grant execute on function public.tonights_sky(),public.publish_star(uuid),public.resonate(uuid),public.create_circle(),public.invite_to_circle(uuid),public.join_circle(uuid),public.leave_circle(uuid),public.circle_checkin(text),public.react_in_circle(uuid,uuid),public.seal_forecast(uuid),public.open_forecast(uuid) to authenticated;

create function public.report_star(star uuid) returns void
 language plpgsql security definer set search_path = '' as $$
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  if not exists(select 1 from public.sky_stars where id=star and not social_private.blocked(user_id)) then raise exception 'This star is unavailable'; end if;
  insert into public.star_reports values(star,auth.uid()) on conflict do nothing;
 end;
$$;
create function public.block_person(star uuid default null,member uuid default null) returns void
 language plpgsql security definer set search_path = '' as $$
 declare person uuid;
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  if star is not null then select user_id into person from public.sky_stars where id=star;
  elsif exists(select 1 from public.circle_members where user_id=member and social_private.member(circle_id)) then person:=member;
  end if;
  if person is null or person=auth.uid() then raise exception 'This person cannot be blocked'; end if;
  insert into public.social_blocks values(auth.uid(),person) on conflict do nothing;
 end;
$$;
create function public.set_friend_consent(allowed boolean) returns void
 language plpgsql security definer set search_path = '' as $$
 begin
  if not exists(select 1 from public.social_profiles where user_id=auth.uid() and age_band='adult') then raise exception 'Friend readings require an adult profile'; end if;
  update public.social_profiles set friends_can_ask=allowed where user_id=auth.uid();
 end;
$$;
create function public.circle_people() returns table(circle_id uuid,user_id uuid,joined_at timestamptz,consulted_on date,theme text,sun_sign text,can_ask boolean)
 language sql stable security definer set search_path = '' as $$
 select m.circle_id,m.user_id,m.joined_at,m.consulted_on,m.theme,p.sun_sign,coalesce(p.friends_can_ask and p.age_band='adult',false)
 from public.circle_members m left join public.social_profiles p on p.user_id=m.user_id
 where social_private.member(m.circle_id) and not social_private.blocked(m.user_id) order by m.joined_at;
$$;
-- Service-only authorization is repeated at generation time, never trusted from a client snapshot.
create function public.authorize_friend_reading(viewer uuid,target_circle uuid,target_member uuid) returns jsonb
 language plpgsql security definer set search_path = '' as $$
 declare profile public.social_profiles; themes jsonb;
 begin
  if not exists(select 1 from public.social_profiles where user_id=viewer and plus) then raise exception 'Friend readings are a Plus extra'; end if;
  if viewer=target_member or not exists(select 1 from public.circle_members where circle_id=target_circle and user_id=viewer)
   or not exists(select 1 from public.circle_members where circle_id=target_circle and user_id=target_member)
   or exists(select 1 from public.social_blocks where (user_id=viewer and blocked_id=target_member) or (user_id=target_member and blocked_id=viewer)) then raise exception 'This friend is unavailable'; end if;
  select * into profile from public.social_profiles where user_id=target_member and age_band='adult' and friends_can_ask for share;
  if profile.user_id is null then raise exception 'This friend has not enabled friend readings'; end if;
  select coalesce(jsonb_agg(distinct m.theme) filter(where m.theme is not null),'[]') into themes from public.circle_members m where m.user_id=target_member and exists(select 1 from public.circle_members v where v.circle_id=m.circle_id and v.user_id=viewer);
  insert into public.friend_notices(user_id) values(target_member);
  return jsonb_build_object('sun_sign',profile.sun_sign,'themes',themes,'teen_viewer',(select age_band<>'adult' from public.social_profiles where user_id=viewer));
 end;
$$;
create function public.dismiss_friend_notices() returns void
 language sql security definer set search_path = '' as $$
 update public.friend_notices set seen=true where user_id=auth.uid();
$$;
create function public.revoke_forecast(card uuid) returns void
 language sql security definer set search_path = '' as $$
 update public.sealed_forecasts set revoked=true where id=card and sender_id=auth.uid();
$$;
revoke all on function public.report_star(uuid),public.block_person(uuid,uuid),public.set_friend_consent(boolean),public.circle_people(),public.authorize_friend_reading(uuid,uuid,uuid),public.dismiss_friend_notices(),public.revoke_forecast(uuid) from public,anon,authenticated;
grant execute on function public.report_star(uuid),public.block_person(uuid,uuid),public.set_friend_consent(boolean),public.circle_people(),public.dismiss_friend_notices(),public.revoke_forecast(uuid) to authenticated;
grant execute on function public.authorize_friend_reading(uuid,uuid,uuid) to service_role;

create function public.withdraw_star(star uuid) returns void
 language sql security definer set search_path = '' as $$
 update public.sky_stars set withdrawn=true where id=star and user_id=auth.uid();
$$;
revoke all on function public.withdraw_star(uuid) from public,anon;
grant execute on function public.withdraw_star(uuid) to authenticated;

create function public.sync_social_profile(viewer uuid,band text,sign text,mock_plus boolean default null) returns void
 language sql security definer set search_path = '' as $$
 insert into public.social_profiles(user_id,age_band,sun_sign,plus) values(viewer,coalesce(band,'unknown'),sign,coalesce(mock_plus,false))
 on conflict(user_id) do update set age_band=excluded.age_band,sun_sign=excluded.sun_sign,
 friends_can_ask=case when excluded.age_band='adult' then social_profiles.friends_can_ask else false end,
 plus=coalesce(mock_plus,social_profiles.plus);
$$;
revoke all on function public.sync_social_profile(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.sync_social_profile(uuid,text,text,boolean) to service_role;
