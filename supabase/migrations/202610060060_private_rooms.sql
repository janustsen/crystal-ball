-- Private Circle rooms: a Plus owner can seal check-in votes until the reveal moment.
-- The room is live only while the current owner holds Plus; an ownership transfer or lapse reopens tallies.
alter table public.circles add column private_room boolean not null default false;

create function social_private.private_room(target uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.circles c join public.social_profiles p on p.user_id=c.owner_id where c.id=target and c.private_room and p.plus_until>now());
$$;
revoke all on function social_private.private_room(uuid) from public,anon;

create function public.set_private_room(target uuid,enabled boolean) returns void
 language plpgsql security definer set search_path='' as $$
 begin
  perform 1 from public.circles where id=target and owner_id=auth.uid() for update;
  if not found then raise exception 'Only the Circle owner can change its room'; end if;
  if enabled and not exists(select 1 from public.social_profiles where user_id=auth.uid() and plus_until>now()) then raise exception 'Private Circle rooms are a Plus extra'; end if;
  update public.circles set private_room=enabled where id=target;
 end;
$$;

create function public.private_rooms() returns table(circle_id uuid)
 language sql stable security definer set search_path='' as $$
 select c.id from public.circles c where social_private.member(c.id) and social_private.private_room(c.id);
$$;

-- In a live room a tally stays sealed (counts null, own vote visible) until every current member has voted
-- or the UTC day after the due date begins.
drop function public.circle_vote_tallies();
create function public.circle_vote_tallies() returns table(forecast_id uuid,yes bigint,no bigint,pending bigint,mine text,sealed boolean)
 language sql stable security definer set search_path='' as $$
 with tally as (
  select f.id,f.circle_id,f.due_date,count(*) filter(where v.vote='yes') as yes,count(*) filter(where v.vote='no') as no,count(*) filter(where v.vote='pending') as pending,max(v.vote) filter(where v.user_id=auth.uid()) as mine
  from public.circle_forecasts f left join public.circle_votes v on v.forecast_id=f.id and not social_private.blocked(v.user_id)
  where social_private.member(f.circle_id) and not social_private.blocked(f.asker_id) group by f.id
 ), state as (
  select t.*,social_private.private_room(t.circle_id) and t.due_date>=(now() at time zone 'UTC')::date
   and exists(select 1 from public.circle_members m where m.circle_id=t.circle_id and not exists(select 1 from public.circle_votes v where v.forecast_id=t.id and v.user_id=m.user_id)) as sealed
  from tally t
 )
 select id,case when sealed then null else yes end,case when sealed then null else no end,case when sealed then null else pending end,mine,sealed from state;
$$;

revoke all on function public.set_private_room(uuid,boolean),public.private_rooms(),public.circle_vote_tallies() from public,anon;
grant execute on function public.set_private_room(uuid,boolean),public.private_rooms(),public.circle_vote_tallies() to authenticated;
