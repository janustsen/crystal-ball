-- Public stars contain only an approved prompt key, never a person's question.
create table public.sky_stars (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 prompt text not null check (prompt in ('love','work','moving','learning','growth','money')),
 day date not null default (now() at time zone 'UTC')::date,
 unique(user_id, day)
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
create table public.sealed_forecasts (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid references auth.users(id) on delete cascade,
 token uuid not null unique default gen_random_uuid(),
 headline text not null check (length(headline) between 1 and 160),
 expires_at timestamptz not null default now() + interval '7 days',
 opened_at timestamptz,
 check ((recipient_id is null) = (opened_at is null)),
 check (sender_id is distinct from recipient_id)
);

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
create policy remove_stars on public.sky_stars for delete to authenticated using (user_id=(select auth.uid()));
create policy own_resonance on public.sky_resonances for select to authenticated using (user_id=(select auth.uid()));
create policy member_circles on public.circles for select to authenticated using (social_private.member(id));
create policy member_list on public.circle_members for select to authenticated using (social_private.member(circle_id));
create policy member_reactions on public.circle_reactions for select to authenticated using (social_private.member(circle_id));
create policy sender_seals on public.sealed_forecasts for select to authenticated using (sender_id=(select auth.uid()));
create policy revoke_seals on public.sealed_forecasts for delete to authenticated using (sender_id=(select auth.uid()));
grant select, delete on public.sky_stars, public.sealed_forecasts to authenticated;
grant select on public.sky_resonances, public.circles, public.circle_members, public.circle_reactions to authenticated;
-- All inserts/updates go through narrowly scoped functions. No direct write grants.

create function public.tonights_sky() returns table(id uuid,prompt text,resonances bigint,resonated boolean,mine boolean)
 language sql stable security definer set search_path = '' as $$
 select s.id,s.prompt,count(r.user_id),coalesce(bool_or(r.user_id=auth.uid()),false),s.user_id=auth.uid()
 from public.sky_stars s left join public.sky_resonances r on r.star_id=s.id
 where auth.uid() is not null and s.day=(now() at time zone 'UTC')::date
 group by s.id order by s.id limit 200;
$$;
create function public.publish_star(chosen_prompt text) returns uuid
 language plpgsql security definer set search_path = '' as $$
 declare result uuid;
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  insert into public.sky_stars(user_id,prompt) values(auth.uid(),chosen_prompt)
   on conflict(user_id,day) do update set prompt=excluded.prompt returning id into result;
  return result;
 end;
$$;
create function public.resonate(star uuid) returns void
 language plpgsql security definer set search_path = '' as $$
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  if not exists(select 1 from public.sky_stars where id=star and day=(now() at time zone 'UTC')::date) then raise exception 'This star has faded'; end if;
  insert into public.sky_resonances values(star,auth.uid()) on conflict do nothing;
 end;
$$;
create function public.create_circle() returns uuid
 language plpgsql security definer set search_path = '' as $$
 declare result uuid;
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  if (select count(*) from public.circle_members where user_id=auth.uid())>=5 then raise exception 'You can join up to five circles'; end if;
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
  delete from public.circle_invites where circle_id=target;
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
  if (select count(*) from public.circle_members where circle_id=target)>=8 then raise exception 'This circle is full'; end if;
  if (select count(*) from public.circle_members where user_id=auth.uid())>=5 then raise exception 'You can join up to five circles'; end if;
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
create function public.circle_checkin() returns void
 language sql security definer set search_path = '' as $$
 update public.circle_members set consulted_on=(now() at time zone 'UTC')::date where user_id=auth.uid();
$$;
create function public.react_in_circle(target_circle uuid,target_member uuid) returns void
 language plpgsql security definer set search_path = '' as $$
 begin
  if not social_private.member(target_circle) then raise exception 'Join this circle first'; end if;
  if not exists(select 1 from public.circle_members where circle_id=target_circle and user_id=target_member and consulted_on=(now() at time zone 'UTC')::date) then raise exception 'No consultation today'; end if;
  insert into public.circle_reactions(circle_id,target_id,user_id) values(target_circle,target_member,auth.uid()) on conflict do nothing;
 end;
$$;
create function public.seal_forecast(forecast text) returns uuid
 language plpgsql security definer set search_path = '' as $$
 declare result uuid;
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  insert into public.sealed_forecasts(sender_id,headline) values(auth.uid(),forecast) returning token into result;
  return result;
 end;
$$;
create function public.open_forecast(seal uuid) returns text
 language plpgsql security definer set search_path = '' as $$
 declare card public.sealed_forecasts;
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  select * into card from public.sealed_forecasts where token=seal and expires_at>now() for update;
  if card.id is null or card.sender_id=auth.uid() or (card.recipient_id is not null and card.recipient_id<>auth.uid()) then raise exception 'This seal is unavailable'; end if;
  update public.sealed_forecasts set recipient_id=auth.uid(),opened_at=coalesce(opened_at,now()) where id=card.id;
  return card.headline;
 end;
$$;

revoke all on function public.tonights_sky(),public.publish_star(text),public.resonate(uuid),public.create_circle(),public.invite_to_circle(uuid),public.join_circle(uuid),public.leave_circle(uuid),public.circle_checkin(),public.react_in_circle(uuid,uuid),public.seal_forecast(text),public.open_forecast(uuid) from public,anon;
grant execute on function public.tonights_sky(),public.publish_star(text),public.resonate(uuid),public.create_circle(),public.invite_to_circle(uuid),public.join_circle(uuid),public.leave_circle(uuid),public.circle_checkin(),public.react_in_circle(uuid,uuid),public.seal_forecast(text),public.open_forecast(uuid) to authenticated;
