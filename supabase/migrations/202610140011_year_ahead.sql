alter table public.social_profiles add column year_ahead_source text check(year_ahead_source in ('purchase','yearly'));

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
  'cardStyle',p.card_style,
  'yearAhead',p.year_ahead_source)
 from public.social_profiles p where p.user_id=viewer);
 end;
$$;

drop function public.apply_store_entitlements(uuid,timestamptz,jsonb,timestamptz);
create function public.apply_store_entitlements(viewer uuid,entitled_until timestamptz,purchases jsonb,snapshot_at timestamptz default now(),year_ahead_source text default null) returns jsonb
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
  update public.social_profiles set
   plus_until=case when store_synced_at is null or snapshot_at>=store_synced_at then entitled_until else plus_until end,
   store_synced_at=greatest(store_synced_at,snapshot_at),packs=packs+granted,
   year_ahead_source=coalesce(social_profiles.year_ahead_source,apply_store_entitlements.year_ahead_source)
   where user_id=viewer;
  update public.social_profiles set plus=coalesce(plus_until>now(),false) where user_id=viewer;
  return public.reading_balance(viewer);
 end;
$$;
revoke all on function public.apply_store_entitlements(uuid,timestamptz,jsonb,timestamptz,text) from public,anon,authenticated;
grant execute on function public.apply_store_entitlements(uuid,timestamptz,jsonb,timestamptz,text) to service_role;
