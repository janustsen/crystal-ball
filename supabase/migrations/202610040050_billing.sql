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
  'day',(now() at time zone 'UTC')::date)
 from public.social_profiles p where p.user_id=viewer);
 end;
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

create or replace function public.seal_forecast(approved_draft uuid) returns uuid
 language plpgsql security definer set search_path = '' as $$
 declare result uuid; draft public.social_drafts; is_plus boolean;
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  insert into public.social_profiles(user_id) values(auth.uid()) on conflict do nothing;
  select coalesce(plus_until>now(),false) into is_plus from public.social_profiles where user_id=auth.uid() for update;
  select * into draft from public.social_drafts where id=approved_draft and user_id=auth.uid() and kind='seal' and expires_at>now();
  if draft.id is null then raise exception 'Approve a fresh sealed draft first'; end if;
  if not is_plus and (select count(*) from public.sealed_forecasts where sender_id=auth.uid() and created_at>=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC')>=1 then raise exception 'Your free seal is used this week. Plus has unlimited seals'; end if;
  insert into public.sealed_forecasts(sender_id,headline) values(auth.uid(),draft.wording) returning token into result;
  return result;
 end;
$$;

create or replace function public.authorize_friend_reading(viewer uuid,target_circle uuid,target_member uuid) returns jsonb
 language plpgsql security definer set search_path = '' as $$
 declare profile public.social_profiles; themes jsonb;
 begin
  if not exists(select 1 from public.social_profiles where user_id=viewer and plus_until>now()) then raise exception 'Friend readings are a Plus extra'; end if;
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

create or replace function social_private.membership_limit() returns trigger
 language plpgsql security definer set search_path='' as $$
 declare allowance integer;
 begin
  insert into public.social_profiles(user_id) values(new.user_id) on conflict do nothing;
  select case when plus_until>now() then 10 else 5 end into allowance from public.social_profiles where user_id=new.user_id for update;
  if (select count(*) from public.circle_members where user_id=new.user_id)>=allowance then raise exception 'Your Circle limit is %',allowance; end if;
  perform 1 from public.circles where id=new.circle_id for update;
  if (select count(*) from public.circle_members where circle_id=new.circle_id)>=20 then raise exception 'This circle is full'; end if;
  return new;
 end;
$$;
