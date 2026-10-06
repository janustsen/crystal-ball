-- Golden forecasts are drawn by the forecast server and recorded here before the client sees them.
-- Only the service role writes; owners may read their own record. A Circle golden draw requires a record.
create table public.golden_forecasts(
 user_id uuid not null references auth.users on delete cascade,
 reading_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(user_id,reading_id)
);
alter table public.golden_forecasts enable row level security;
revoke all on public.golden_forecasts from public,anon,authenticated;
grant select on public.golden_forecasts to authenticated;
create policy own_golden on public.golden_forecasts for select to authenticated using(user_id=auth.uid());

create or replace function public.share_circle_moment(reading uuid,moment text) returns void
 language plpgsql security definer set search_path='' as $$
 begin
  if moment not in ('yes','no','pending','golden') then raise exception 'Choose a check-in or golden draw'; end if;
  if moment='golden' and not exists(select 1 from public.golden_forecasts where user_id=auth.uid() and reading_id=reading) then raise exception 'Only a drawn golden forecast can be shared'; end if;
  perform 1 from public.social_profiles where user_id=auth.uid() for update;
  if moment<>'golden' then delete from public.circle_moments where user_id=auth.uid() and reading_id=reading and kind<>'golden'; end if;
  insert into public.circle_moments(circle_id,user_id,reading_id,kind) select circle_id,user_id,reading,moment from public.circle_members where user_id=auth.uid() on conflict do nothing;
 end;
$$;
