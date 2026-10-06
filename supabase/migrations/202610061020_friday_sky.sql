-- Friday Sky: one moderated omen per School and per Circle opens at 20:00 on each viewer's local Friday.
-- The zone is the viewer's own clock; sky_push defaults on, so only accounts with a push token are notified.
alter table public.social_profiles add column time_zone text, add column sky_push boolean not null default true;
create table public.sky_omens(
 id uuid primary key default gen_random_uuid(),week date not null check(extract(isodow from week)=5),
 school_id text references public.schools on delete cascade,circle_id uuid references public.circles on delete cascade,
 omen text not null check(length(omen) between 10 and 160),created_at timestamptz not null default now(),
 check(num_nonnulls(school_id,circle_id)=1),unique(week,school_id),unique(week,circle_id)
);
create table public.sky_pushes(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,week date not null,
 claimed_until timestamptz,delivered_at timestamptz,unique(user_id,week)
);
alter table public.sky_omens enable row level security;
alter table public.sky_pushes enable row level security;
revoke all on public.sky_omens,public.sky_pushes from public,anon,authenticated;

-- The latest Friday whose 20:00 has passed on the given local clock.
create function social_private.sky_week(zone text,moment timestamptz) returns date
 language sql stable set search_path='' as $$
 select d-((extract(isodow from d)::int+2)%7) from (select ((moment at time zone zone)-interval '20 hours')::date d) local;
$$;
create function social_private.sky_omens_for(viewer uuid,target_week date) returns setof public.sky_omens
 language sql stable security definer set search_path='' as $$
 select o.* from public.sky_omens o where o.week=target_week and (
  o.school_id=(select p.school_id from public.social_profiles p where p.user_id=viewer)
  or exists(select 1 from public.circle_members m where m.circle_id=o.circle_id and m.user_id=viewer));
$$;
create function public.open_sky(zone text) returns table(week date,school_id text,circle_id uuid,omen text)
 language plpgsql security definer set search_path='' as $$
 declare saved text;
 begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if zone is not null then
   begin
    perform now() at time zone zone;
    insert into public.social_profiles(user_id,time_zone) values(auth.uid(),zone) on conflict(user_id) do update set time_zone=excluded.time_zone;
   exception when invalid_parameter_value then null;
   end;
  end if;
  select p.time_zone into saved from public.social_profiles p where p.user_id=auth.uid();
  return query select o.week,o.school_id,o.circle_id,o.omen from social_private.sky_omens_for(auth.uid(),social_private.sky_week(coalesce(saved,'UTC'),now())) o;
 end;
$$;
create function public.set_sky_push(enabled boolean) returns void
 language plpgsql security definer set search_path='' as $$
 begin
  if auth.uid() is null or enabled is null then raise exception 'Choose whether the Sky may notify you'; end if;
  insert into public.social_profiles(user_id,sky_push) values(auth.uid(),enabled) on conflict(user_id) do update set sky_push=excluded.sky_push;
 end;
$$;

-- Generation is service-only: the trusted scheduler writes each group's omen once per week.
create function public.sky_omen_targets(target_week date) returns table(school_id text,circle_id uuid)
 language sql stable security definer set search_path='' as $$
 select s.id,null::uuid from public.schools s
 where exists(select 1 from public.social_profiles p where p.school_id=s.id)
  and not exists(select 1 from public.sky_omens o where o.week=target_week and o.school_id=s.id)
 union all
 select null,c.id from public.circles c where not exists(select 1 from public.sky_omens o where o.week=target_week and o.circle_id=c.id)
 limit 500;
$$;
create function public.save_sky_omen(target_week date,school text,circle uuid,text_value text) returns void
 language sql security definer set search_path='' as $$
 insert into public.sky_omens(week,school_id,circle_id,omen) values(target_week,school,circle,text_value) on conflict do nothing;
$$;

-- One push per account per week, queued at local Friday 20:00 and delivered only that same local evening.
create function social_private.queue_sky_pushes(moment timestamptz) returns void
 language sql security definer set search_path='' as $$
 insert into public.sky_pushes(user_id,week)
 select p.user_id,(moment at time zone p.time_zone)::date
 from public.social_profiles p join public.social_push_tokens t on t.user_id=p.user_id
 where p.sky_push and p.time_zone is not null
  and extract(isodow from moment at time zone p.time_zone)=5 and (moment at time zone p.time_zone)::time>='20:00'
  and exists(select 1 from social_private.sky_omens_for(p.user_id,(moment at time zone p.time_zone)::date))
 on conflict do nothing;
$$;
create function public.claim_sky_pushes() returns table(id uuid,token text,kind text,circle_id uuid)
 language plpgsql security definer set search_path='' as $$
 begin
  perform social_private.queue_sky_pushes(now());
  return query with pending as (
   select s.id,t.token from public.sky_pushes s
   join public.social_push_tokens t on t.user_id=s.user_id join public.social_profiles pr on pr.user_id=s.user_id
   where s.delivered_at is null and (s.claimed_until is null or s.claimed_until<now())
    and pr.sky_push and s.week=(now() at time zone pr.time_zone)::date
    and extract(isodow from now() at time zone pr.time_zone)=5 and (now() at time zone pr.time_zone)::time>='20:00'
    and exists(select 1 from social_private.sky_omens_for(pr.user_id,s.week))
   order by s.week limit 100 for update of s skip locked
  ), claimed as (update public.sky_pushes s set claimed_until=now()+interval '5 minutes' from pending p where s.id=p.id returning s.id)
  select c.id,p.token,'sky'::text,null::uuid from claimed c join pending p on p.id=c.id;
 end;
$$;
create function public.finish_sky_push(notification uuid) returns void language sql security definer set search_path='' as $$
 update public.sky_pushes set delivered_at=now() where id=notification;
$$;

revoke all on function social_private.sky_week(text,timestamptz),social_private.sky_omens_for(uuid,date),social_private.queue_sky_pushes(timestamptz) from public,anon,authenticated;
revoke all on function public.open_sky(text),public.set_sky_push(boolean) from public,anon;
grant execute on function public.open_sky(text),public.set_sky_push(boolean) to authenticated;
revoke all on function public.sky_omen_targets(date),public.save_sky_omen(date,text,uuid,text),public.claim_sky_pushes(),public.finish_sky_push(uuid) from public,anon,authenticated;
grant execute on function public.sky_omen_targets(date),public.save_sky_omen(date,text,uuid,text),public.claim_sky_pushes(),public.finish_sky_push(uuid) to service_role;
