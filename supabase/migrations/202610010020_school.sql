-- Small public campus catalog; no user coordinates enter the database.
create table public.schools (
 id text primary key,
 name text not null,
 city text not null,
 latitude double precision not null,
 longitude double precision not null
);
alter table public.schools enable row level security;
revoke all on public.schools from public,anon,authenticated;
grant select on public.schools to authenticated;
create policy school_catalog on public.schools for select to authenticated using(true);
-- Seed boundary: SFUSD campuses, rounded campus positions for nearby ranking only.
insert into public.schools values
 ('sfusd-lowell','Lowell High School','San Francisco',37.73,-122.48),
 ('sfusd-washington','George Washington High School','San Francisco',37.78,-122.49),
 ('sfusd-lincoln','Abraham Lincoln High School','San Francisco',37.75,-122.48);
alter table public.social_profiles add column school_id text references public.schools(id);

create function public.set_school(chosen_school text) returns void
 language plpgsql security definer set search_path = '' as $$
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  insert into public.social_profiles(user_id,school_id) values(auth.uid(),chosen_school)
  on conflict(user_id) do update set school_id=excluded.school_id;
 end;
$$;

-- Keep the anonymous projection and moderation; filter BEFORE the global limit.
drop function public.tonights_sky();
create function public.tonights_sky(my_school boolean default false) returns table(id uuid,theme text,wording text,resonances bigint,resonated boolean,mine boolean)
 language sql stable security definer set search_path = '' as $$
 select s.id,s.theme,s.wording,count(r.user_id),coalesce(bool_or(r.user_id=auth.uid()),false),s.user_id=auth.uid()
 from public.sky_stars s left join public.sky_resonances r on r.star_id=s.id
 and not exists(select 1 from public.social_blocks b where (b.user_id=s.user_id and b.blocked_id=r.user_id) or (b.blocked_id=s.user_id and b.user_id=r.user_id))
 where auth.uid() is not null and s.day=(now() at time zone 'UTC')::date
 and (not coalesce(my_school,false) or exists(
  select 1 from public.social_profiles author join public.social_profiles viewer on viewer.school_id=author.school_id
  where author.user_id=s.user_id and viewer.user_id=auth.uid()))
 and not s.withdrawn and not social_private.blocked(s.user_id)
 and (select count(*) from public.star_reports reports where star_id=s.id
 and not exists(select 1 from public.social_blocks b where (b.user_id=s.user_id and b.blocked_id=reports.user_id) or (b.blocked_id=s.user_id and b.user_id=reports.user_id)))<3
 group by s.id order by s.id limit 200;
$$;

-- Only the creator can issue Circle invitations. A current creator/member pair
-- therefore proves a direct accepted invitation; two fellow members do not.
create function public.school_circle_suggestions() returns table(circle_id uuid,user_id uuid)
 language sql stable security definer set search_path = '' as $$
 select distinct c.id,peer.user_id
 from public.circles c
 join public.circle_members me on me.circle_id=c.id and me.user_id=auth.uid()
 join public.circle_members peer on peer.circle_id=c.id and peer.user_id<>auth.uid()
 join public.social_profiles mine on mine.user_id=auth.uid()
 join public.social_profiles theirs on theirs.user_id=peer.user_id and theirs.school_id=mine.school_id
 where (c.owner_id=auth.uid() or c.owner_id=peer.user_id)
 and not social_private.blocked(peer.user_id)
 order by c.id,peer.user_id;
$$;
revoke all on function public.set_school(text),public.tonights_sky(boolean),public.school_circle_suggestions() from public,anon;
grant execute on function public.set_school(text),public.tonights_sky(boolean),public.school_circle_suggestions() to authenticated;

create function public.create_school_circle_invite(previous uuid default null) returns uuid
 language plpgsql security definer set search_path = '' as $$
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  if exists(select 1 from public.circle_invites i join public.circles c on c.id=i.circle_id
   where i.token=previous and i.expires_at>now() and c.owner_id=auth.uid()
   and not exists(select 1 from public.circle_members m where m.circle_id=c.id and m.user_id<>auth.uid()))
  then return previous; end if;
  return public.invite_to_circle(public.create_circle());
 end;
$$;
revoke all on function public.create_school_circle_invite(uuid) from public,anon;
grant execute on function public.create_school_circle_invite(uuid) to authenticated;
