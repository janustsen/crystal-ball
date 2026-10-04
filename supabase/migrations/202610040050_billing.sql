-- Server-owned entitlements. Only the billing service (RevenueCat reconciliation) grants Plus or packs;
-- every reading is charged here, including Circle forecasts at publication. Clients may only read their row.
alter table public.social_profiles add column plus_until timestamptz, add column packs integer not null default 0 check(packs>=0);
create table public.pack_purchases(
 transaction_id text primary key,
 user_id uuid not null references auth.users on delete cascade,
 readings integer not null check(readings>0),
 created_at timestamptz not null default now()
);
create table public.reading_charges(
 user_id uuid not null references auth.users on delete cascade,
 reading_id text not null check(length(reading_id) between 1 and 100),
 day date not null,
 source text not null check(source in ('daily','pack')),
 primary key(user_id,reading_id)
);
alter table public.pack_purchases enable row level security;
alter table public.reading_charges enable row level security;
revoke all on public.pack_purchases,public.reading_charges from public,anon,authenticated;

-- Free: 1 reading per UTC day; Plus: 10. Packs cover readings beyond the daily allowance and never expire.
create function public.reading_balance(viewer uuid) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'plus',coalesce(p.plus_until>now(),false),
  'plusUntil',p.plus_until,
  'packs',coalesce(p.packs,0),
  'used',(select count(*) from public.reading_charges c where c.user_id=viewer and c.day=(now() at time zone 'UTC')::date),
  'day',(now() at time zone 'UTC')::date)
 from (select viewer) v left join public.social_profiles p on p.user_id=v.viewer;
$$;

-- Idempotent per reading: retrying the same reading never charges twice.
create function public.charge_reading(viewer uuid,reading text) returns jsonb
 language plpgsql security definer set search_path='' as $$
 declare today date:=(now() at time zone 'UTC')::date; profile public.social_profiles; used integer;
 begin
  insert into public.social_profiles(user_id) values(viewer) on conflict do nothing;
  select * into profile from public.social_profiles where user_id=viewer for update;
  if not exists(select 1 from public.reading_charges where user_id=viewer and reading_id=reading) then
   select count(*) into used from public.reading_charges where user_id=viewer and day=today;
   if used<(case when coalesce(profile.plus_until>now(),false) then 10 else 1 end) then
    insert into public.reading_charges values(viewer,reading,today,'daily');
   elsif profile.packs>0 then
    update public.social_profiles set packs=packs-1 where user_id=viewer;
    insert into public.reading_charges values(viewer,reading,today,'pack');
   else
    raise exception 'No readings left today';
   end if;
  end if;
  return public.reading_balance(viewer);
 end;
$$;

-- RevenueCat reconciliation: subscription expiry is replaced wholesale; each pack transaction credits once.
-- plus mirrors plus_until for the social rules (seals, Circle limits, friend readings).
create function public.apply_store_entitlements(viewer uuid,entitled_until timestamptz,purchases jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
 declare granted integer;
 begin
  insert into public.social_profiles(user_id) values(viewer) on conflict do nothing;
  perform 1 from public.social_profiles where user_id=viewer for update;
  with fresh as (
   insert into public.pack_purchases(transaction_id,user_id,readings)
   select p->>'id',viewer,(p->>'readings')::integer from jsonb_array_elements(purchases) p
   on conflict do nothing returning readings)
  select coalesce(sum(readings),0) into granted from fresh;
  update public.social_profiles set plus_until=entitled_until,plus=coalesce(entitled_until>now(),false),packs=packs+granted where user_id=viewer;
  return public.reading_balance(viewer);
 end;
$$;
revoke all on function public.reading_balance(uuid),public.charge_reading(uuid,text),public.apply_store_entitlements(uuid,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.reading_balance(uuid),public.charge_reading(uuid,text),public.apply_store_entitlements(uuid,timestamptz,jsonb) to service_role;

-- Publishing a Circle forecast is the asker's reading; it is charged in the same transaction.
drop function public.mark_circle_charged(uuid);
create or replace function public.publish_circle_forecast(approved_draft uuid) returns public.circle_forecasts
 language plpgsql security definer set search_path='' as $$
 declare draft public.circle_forecast_drafts; result public.circle_forecasts;
 begin
  select * into draft from public.circle_forecast_drafts where id=approved_draft and user_id=auth.uid() and expires_at>now();
  perform 1 from public.circles where id=draft.circle_id for update;
  if draft.id is null or not social_private.member(draft.circle_id) then raise exception 'Approve a fresh Circle forecast first'; end if;
  select * into result from public.circle_forecasts where id=draft.id;
  if result.id is not null then return result; end if;
  if exists(select 1 from public.circle_forecasts where circle_id=draft.circle_id and due_date>(now() at time zone 'UTC')::date) then raise exception 'This Circle already has an open forecast'; end if;
  if draft.due_date<=(now() at time zone 'UTC')::date or draft.due_date>(now() at time zone 'UTC')::date+365 then raise exception 'Choose a due date within one year'; end if;
  perform public.charge_reading(auth.uid(),draft.id::text);
  insert into public.circle_forecasts(id,circle_id,asker_id,question,headline,due_date,charged_at) values(draft.id,draft.circle_id,auth.uid(),draft.question,draft.headline,draft.due_date,now()) returning * into result;
  insert into public.social_notifications(user_id,actor_id,circle_id,kind,reference_id,deliver_after)
   select user_id,auth.uid(),draft.circle_id,'forecast',draft.id,now() from public.circle_members where circle_id=draft.circle_id and user_id<>auth.uid();
  insert into public.social_notifications(user_id,actor_id,circle_id,kind,reference_id,deliver_after)
   select user_id,auth.uid(),draft.circle_id,'vote',draft.id,draft.due_date::timestamp at time zone 'UTC' from public.circle_members where circle_id=draft.circle_id;
  return result;
 end;
$$;
