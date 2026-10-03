-- Identity is projected through discovery and Circle RPCs, never a public profile table.
alter table public.social_profiles add column handle text unique check(handle ~ '^[a-z0-9_]{3,24}$'), add column display_name text check(length(display_name) between 1 and 40), add column avatar text not null default '✦' check(avatar in ('✦','🌙','☀️','🪐','🌸','🌊'));
create function public.set_social_identity(chosen_handle text,chosen_name text,chosen_avatar text) returns void
 language plpgsql security definer set search_path='' as $$
 begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if chosen_handle is null or chosen_name is null or chosen_avatar is null then raise exception 'Choose a handle, name and avatar'; end if;
  insert into public.social_profiles(user_id,handle,display_name,avatar) values(auth.uid(),lower(trim(chosen_handle)),trim(chosen_name),chosen_avatar)
   on conflict(user_id) do update set handle=excluded.handle,display_name=excluded.display_name,avatar=excluded.avatar;
 end;
$$;
create function social_private.discoverable(person uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and person<>auth.uid() and not social_private.blocked(person) and exists(
  select 1 from public.social_profiles p where p.user_id=person and p.handle is not null and
  (p.age_band='adult' or (p.age_band='teen' and p.school_id is not null and exists(select 1 from public.social_profiles v where v.user_id=auth.uid() and v.age_band='teen' and v.school_id=p.school_id))));
$$;
create function public.search_handles(prefix text) returns table(handle text,display_name text,avatar text)
 language sql stable security definer set search_path='' as $$
 select p.handle,p.display_name,p.avatar from public.social_profiles p
 where length(trim(prefix))>=2 and starts_with(p.handle,lower(ltrim(trim(prefix),'@'))) and social_private.discoverable(p.user_id)
 order by p.handle limit 20;
$$;
create function public.block_handle(target_handle text) returns void
 language plpgsql security definer set search_path='' as $$
 declare person uuid;
 begin
  select user_id into person from public.social_profiles where handle=target_handle and social_private.discoverable(user_id);
  if person is null then raise exception 'This person is unavailable'; end if;
  insert into public.social_blocks values(auth.uid(),person) on conflict do nothing;
 end;
$$;
-- A profile lock serializes every membership insertion, including link joins and school Circles.
create function social_private.membership_limit() returns trigger
 language plpgsql security definer set search_path='' as $$
 declare allowance integer;
 begin
  insert into public.social_profiles(user_id) values(new.user_id) on conflict do nothing;
  select case when plus then 10 else 5 end into allowance from public.social_profiles where user_id=new.user_id for update;
  if (select count(*) from public.circle_members where user_id=new.user_id)>=allowance then raise exception 'Your Circle limit is %',allowance; end if;
  perform 1 from public.circles where id=new.circle_id for update;
  if (select count(*) from public.circle_members where circle_id=new.circle_id)>=20 then raise exception 'This circle is full'; end if;
  return new;
 end;
$$;
create trigger membership_limit before insert on public.circle_members for each row execute function social_private.membership_limit();
create function public.manage_circle(target uuid,person uuid,operation text) returns void
 language plpgsql security definer set search_path='' as $$
 begin
  perform 1 from public.circles where id=target and owner_id=auth.uid() for update;
  if not found then raise exception 'Only the owner can manage this Circle'; end if;
  if person=auth.uid() or not exists(select 1 from public.circle_members where circle_id=target and user_id=person) then raise exception 'Choose another member'; end if;
  if operation='transfer' then
   update public.circles set owner_id=person where id=target;
   delete from public.circle_invites where circle_id=target;
   update public.circle_requests set status='declined' where circle_id=target and status='pending';
  elsif operation='remove' then delete from public.circle_members where circle_id=target and user_id=person;
  else raise exception 'Choose remove or transfer'; end if;
 end;
$$;
create or replace function public.leave_circle(target uuid) returns void
 language plpgsql security definer set search_path='' as $$
 declare successor uuid;
 begin
  perform 1 from public.circles where id=target for update;
  if exists(select 1 from public.circles where id=target and owner_id=auth.uid()) then
   select user_id into successor from public.circle_members where circle_id=target and user_id<>auth.uid() order by joined_at,user_id limit 1;
   if successor is null then delete from public.circles where id=target; return; end if;
   update public.circles set owner_id=successor where id=target;
   delete from public.circle_invites where circle_id=target;
   update public.circle_requests set status='declined' where circle_id=target and status='pending';
  end if;
  delete from public.circle_members where circle_id=target and user_id=auth.uid();
 end;
$$;
create table public.circle_requests(
 id uuid primary key default gen_random_uuid(),circle_id uuid not null references public.circles on delete cascade,
 sender_id uuid not null references auth.users on delete cascade,recipient_id uuid not null references auth.users on delete cascade,
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '7 days',
 status text not null default 'pending' check(status in ('pending','accepted','declined'))
);
create unique index one_pending_request on public.circle_requests(circle_id,recipient_id) where status='pending';
create table public.social_notifications(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
 actor_id uuid not null references auth.users on delete cascade,circle_id uuid references public.circles on delete cascade,
 kind text not null check(kind in ('seal','invite','joined','forecast','vote')),reference_id uuid not null,
 deliver_after timestamptz not null default now(),delivered_at timestamptz,
 unique(user_id,kind,reference_id)
);
create function public.request_circle_invite(target uuid,target_handle text) returns void
 language plpgsql security definer set search_path='' as $$
 declare person uuid; request_id uuid;
 begin
  perform 1 from public.social_profiles where user_id=auth.uid() and handle is not null for update;
  if not found then raise exception 'Choose your handle first'; end if;
  if not exists(select 1 from public.circles where id=target and owner_id=auth.uid()) then raise exception 'Only the owner can invite'; end if;
  select user_id into person from public.social_profiles where handle=target_handle and social_private.discoverable(user_id);
  if person is null or exists(select 1 from public.circle_members where circle_id=target and user_id=person) then raise exception 'This person is unavailable'; end if;
  if (select count(*) from public.circle_requests where sender_id=auth.uid() and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC' and status='pending')>=20 then raise exception 'You have 20 pending invites today'; end if;
  update public.circle_requests set status='declined' where circle_id=target and recipient_id=person and status='pending' and expires_at<=now();
  insert into public.circle_requests(circle_id,sender_id,recipient_id) values(target,auth.uid(),person) returning id into request_id;
  insert into public.social_notifications(user_id,actor_id,circle_id,kind,reference_id) values(person,auth.uid(),target,'invite',request_id);
 end;
$$;
create function public.circle_inbox() returns table(id uuid,circle_id uuid,handle text,display_name text,avatar text)
 language sql stable security definer set search_path='' as $$
 select r.id,r.circle_id,p.handle,p.display_name,p.avatar from public.circle_requests r join public.social_profiles p on p.user_id=r.sender_id
 where r.recipient_id=auth.uid() and r.status='pending' and r.expires_at>now() and not social_private.blocked(r.sender_id);
$$;
create function public.answer_circle_invite(request_id uuid,accept boolean) returns void
 language plpgsql security definer set search_path='' as $$
 declare invitation public.circle_requests;
 begin
  select * into invitation from public.circle_requests where id=request_id and recipient_id=auth.uid() and status='pending' and expires_at>now() for update;
  if invitation.id is null or social_private.blocked(invitation.sender_id) then raise exception 'This invitation is unavailable'; end if;
  if accept then
   if not exists(select 1 from public.circles where id=invitation.circle_id and owner_id=invitation.sender_id) or exists(select 1 from public.circle_members where circle_id=invitation.circle_id and social_private.blocked(user_id)) then raise exception 'This invitation is unavailable'; end if;
   insert into public.circle_members(circle_id,user_id) values(invitation.circle_id,auth.uid());
  end if;
  update public.circle_requests set status=case when accept then 'accepted' else 'declined' end where id=request_id;
 end;
$$;
create table public.circle_connections(
 circle_id uuid not null,inviter_id uuid not null,invitee_id uuid not null,
 primary key(circle_id,inviter_id,invitee_id),check(inviter_id<>invitee_id),
 foreign key(circle_id,inviter_id) references public.circle_members(circle_id,user_id) on delete cascade,
 foreign key(circle_id,invitee_id) references public.circle_members(circle_id,user_id) on delete cascade
);
alter table public.circle_connections enable row level security;
revoke all on public.circle_connections from public,anon,authenticated;
-- Before this migration only the original creator could own and invite.
insert into public.circle_connections select c.id,c.owner_id,m.user_id from public.circles c join public.circle_members m on m.circle_id=c.id and m.user_id<>c.owner_id;
create function social_private.join_notice() returns trigger language plpgsql security definer set search_path='' as $$
 begin
  insert into public.circle_connections select new.circle_id,c.owner_id,new.user_id from public.circles c where c.id=new.circle_id and c.owner_id<>new.user_id on conflict do nothing;
  insert into public.social_notifications(user_id,actor_id,circle_id,kind,reference_id)
   select user_id,new.user_id,new.circle_id,'joined',gen_random_uuid() from public.circle_members where circle_id=new.circle_id and user_id<>new.user_id;
  return new;
 end;
$$;
create trigger join_notice after insert on public.circle_members for each row execute function social_private.join_notice();
drop function public.circle_people();
create function public.circle_people() returns table(circle_id uuid,user_id uuid,joined_at timestamptz,consulted_on date,theme text,sun_sign text,can_ask boolean,handle text,display_name text,avatar text)
 language sql stable security definer set search_path='' as $$
 select m.circle_id,m.user_id,m.joined_at,m.consulted_on,m.theme,p.sun_sign,coalesce(p.friends_can_ask and p.age_band='adult',false),p.handle,p.display_name,p.avatar
 from public.circle_members m left join public.social_profiles p on p.user_id=m.user_id
 where social_private.member(m.circle_id) and not social_private.blocked(m.user_id) order by m.joined_at;
$$;
create table public.circle_moments(
 id uuid primary key default gen_random_uuid(),circle_id uuid not null,user_id uuid not null,
 reading_id uuid not null,kind text not null check(kind in ('yes','no','pending','golden')),
 day date not null default (now() at time zone 'UTC')::date,
 foreign key(circle_id,user_id) references public.circle_members on delete cascade,unique(circle_id,user_id,reading_id,kind)
);
create table public.circle_glows(circle_id uuid not null references public.circles on delete cascade,day date not null,primary key(circle_id,day));
create or replace function public.circle_checkin(activity_theme text) returns void
 language plpgsql security definer set search_path='' as $$
 begin
  perform 1 from public.circles where social_private.member(id) order by id for update;
  update public.circle_members set consulted_on=(now() at time zone 'UTC')::date,theme=activity_theme where user_id=auth.uid();
  insert into public.circle_glows select c.id,(now() at time zone 'UTC')::date from public.circles c
   where social_private.member(c.id) and not exists(select 1 from public.circle_members m where m.circle_id=c.id and m.consulted_on is distinct from (now() at time zone 'UTC')::date) on conflict do nothing;
 end;
$$;
create function public.share_circle_moment(reading uuid,moment text) returns void
 language plpgsql security definer set search_path='' as $$
 begin
  if moment not in ('yes','no','pending','golden') then raise exception 'Choose a check-in or golden draw'; end if;
  if moment<>'golden' then delete from public.circle_moments where user_id=auth.uid() and reading_id=reading and kind<>'golden'; end if;
  insert into public.circle_moments(circle_id,user_id,reading_id,kind) select circle_id,user_id,reading,moment from public.circle_members where user_id=auth.uid() on conflict do nothing;
 end;
$$;
alter table public.circle_reactions add column emoji text not null default '✦' check(emoji in ('✦','❤️','🌙','✨'));
drop function public.react_in_circle(uuid,uuid);
create function public.react_in_circle(target_circle uuid,target_member uuid,reaction text default '✦') returns void
 language plpgsql security definer set search_path='' as $$
 begin
  if social_private.blocked(target_member) or not social_private.member(target_circle) then raise exception 'Join this circle first'; end if;
  insert into public.circle_reactions(circle_id,target_id,user_id,emoji) values(target_circle,target_member,auth.uid(),reaction)
   on conflict(circle_id,target_id,user_id,day) do update set emoji=excluded.emoji;
 end;
$$;
-- Only the moderation service can create a receipt containing a visible question and forecast.
create table public.circle_forecast_drafts(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
 circle_id uuid not null references public.circles on delete cascade,question text not null check(length(question) between 4 and 160),
 headline text not null check(length(headline) between 4 and 160),due_date date not null,
 expires_at timestamptz not null default now()+interval '15 minutes'
);
create table public.circle_forecasts(
 id uuid primary key references public.circle_forecast_drafts, circle_id uuid not null references public.circles on delete cascade,
 asker_id uuid not null references auth.users on delete cascade,question text not null,headline text not null,due_date date not null,created_at timestamptz not null default now()
);
create table public.circle_votes(
 forecast_id uuid not null references public.circle_forecasts on delete cascade,user_id uuid not null references auth.users on delete cascade,
 vote text not null check(vote in ('yes','no','pending')),primary key(forecast_id,user_id)
);
create function public.publish_circle_forecast(approved_draft uuid) returns public.circle_forecasts
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
  insert into public.circle_forecasts(id,circle_id,asker_id,question,headline,due_date) values(draft.id,draft.circle_id,auth.uid(),draft.question,draft.headline,draft.due_date) returning * into result;
  insert into public.social_notifications(user_id,actor_id,circle_id,kind,reference_id,deliver_after)
   select user_id,auth.uid(),draft.circle_id,'forecast',draft.id,now() from public.circle_members where circle_id=draft.circle_id and user_id<>auth.uid();
  insert into public.social_notifications(user_id,actor_id,circle_id,kind,reference_id,deliver_after)
   select user_id,auth.uid(),draft.circle_id,'vote',draft.id,draft.due_date::timestamp at time zone 'UTC' from public.circle_members where circle_id=draft.circle_id;
  return result;
 end;
$$;
create function public.vote_circle_forecast(forecast uuid,answer text) returns void
 language plpgsql security definer set search_path='' as $$
 begin
  perform 1 from public.circles where id=(select circle_id from public.circle_forecasts where id=forecast) for update;
  if not exists(select 1 from public.circle_forecasts where id=forecast and social_private.member(circle_id) and due_date<=(now() at time zone 'UTC')::date and not social_private.blocked(asker_id)) then raise exception 'This check-in is unavailable'; end if;
  insert into public.circle_votes values(forecast,auth.uid(),answer) on conflict(forecast_id,user_id) do update set vote=excluded.vote;
 end;
$$;
create function public.circle_vote_tallies() returns table(forecast_id uuid,yes bigint,no bigint,pending bigint,mine text)
 language sql stable security definer set search_path='' as $$
 select f.id,count(*) filter(where v.vote='yes'),count(*) filter(where v.vote='no'),count(*) filter(where v.vote='pending'),max(v.vote) filter(where v.user_id=auth.uid())
 from public.circle_forecasts f left join public.circle_votes v on v.forecast_id=f.id and not social_private.blocked(v.user_id)
 where social_private.member(f.circle_id) and not social_private.blocked(f.asker_id) group by f.id;
$$;
alter table public.sealed_forecasts add column intended_recipient uuid references auth.users on delete cascade;
create function public.send_sealed_forecast(approved_draft uuid,target_circle uuid,target_member uuid) returns uuid
 language plpgsql security definer set search_path='' as $$
 declare sealed_token uuid; card_id uuid;
 begin
  perform 1 from public.social_profiles where user_id=auth.uid() for update;
  perform 1 from public.circles where id=target_circle for update;
  if target_member=auth.uid() or social_private.blocked(target_member) or not social_private.member(target_circle) or not exists(select 1 from public.circle_members where circle_id=target_circle and user_id=target_member) then raise exception 'Choose a Circle member'; end if;
  sealed_token:=public.seal_forecast(approved_draft);
  update public.sealed_forecasts s set intended_recipient=target_member where s.token=sealed_token returning id into card_id;
  insert into public.social_notifications(user_id,actor_id,circle_id,kind,reference_id) values(target_member,auth.uid(),target_circle,'seal',card_id);
  return sealed_token;
 end;
$$;
create function public.sealed_inbox() returns table(token uuid,opened_at timestamptz)
 language sql stable security definer set search_path='' as $$
 select s.token,s.opened_at from public.sealed_forecasts s where s.intended_recipient=auth.uid() and not s.revoked and not social_private.blocked(s.sender_id);
$$;
create or replace function public.open_forecast(seal uuid) returns text
 language plpgsql security definer set search_path='' as $$
 declare card public.sealed_forecasts;
 begin
  if auth.uid() is null then raise exception 'Sign in anonymously first'; end if;
  select * into card from public.sealed_forecasts where token=seal and not revoked for update;
  if card.id is null or social_private.blocked(card.sender_id) or card.sender_id=auth.uid() or (card.intended_recipient is not null and card.intended_recipient<>auth.uid()) or (card.recipient_id is not null and card.recipient_id<>auth.uid()) then raise exception 'This seal is unavailable'; end if;
  update public.sealed_forecasts set recipient_id=auth.uid(),opened_at=coalesce(opened_at,now()) where id=card.id;
  return card.headline;
 end;
$$;
-- Default Supabase grants are deliberately removed for every new relation/function.
alter table public.circle_requests enable row level security;
alter table public.social_notifications enable row level security;
alter table public.circle_moments enable row level security;
alter table public.circle_glows enable row level security;
alter table public.circle_forecast_drafts enable row level security;
alter table public.circle_forecasts enable row level security;
alter table public.circle_votes enable row level security;
revoke all on public.circle_requests,public.social_notifications,public.circle_moments,public.circle_glows,public.circle_forecast_drafts,public.circle_forecasts,public.circle_votes from public,anon,authenticated;
grant select on public.circle_moments,public.circle_glows,public.circle_forecasts to authenticated;
grant select,insert on public.circle_forecast_drafts to service_role;
grant select,update on public.social_notifications to service_role;
create policy visible_moments on public.circle_moments for select to authenticated using(social_private.member(circle_id) and not social_private.blocked(user_id));
create policy visible_glows on public.circle_glows for select to authenticated using(social_private.member(circle_id));
create policy visible_forecasts on public.circle_forecasts for select to authenticated using(social_private.member(circle_id) and not social_private.blocked(asker_id));
revoke all on function social_private.discoverable(uuid),social_private.membership_limit(),social_private.join_notice() from public,anon,authenticated;
revoke all on function public.set_social_identity(text,text,text),public.search_handles(text),public.block_handle(text),public.manage_circle(uuid,uuid,text),public.request_circle_invite(uuid,text),public.circle_inbox(),public.answer_circle_invite(uuid,boolean),public.circle_people(),public.share_circle_moment(uuid,text),public.react_in_circle(uuid,uuid,text),public.publish_circle_forecast(uuid),public.vote_circle_forecast(uuid,text),public.circle_vote_tallies(),public.send_sealed_forecast(uuid,uuid,uuid),public.sealed_inbox() from public,anon;
grant execute on function public.set_social_identity(text,text,text),public.search_handles(text),public.block_handle(text),public.manage_circle(uuid,uuid,text),public.request_circle_invite(uuid,text),public.circle_inbox(),public.answer_circle_invite(uuid,boolean),public.circle_people(),public.share_circle_moment(uuid,text),public.react_in_circle(uuid,uuid,text),public.publish_circle_forecast(uuid),public.vote_circle_forecast(uuid,text),public.circle_vote_tallies(),public.send_sealed_forecast(uuid,uuid,uuid),public.sealed_inbox() to authenticated;

create table public.social_push_tokens(user_id uuid primary key references auth.users on delete cascade,token text not null unique check(token ~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$'));
alter table public.social_push_tokens enable row level security;
revoke all on public.social_push_tokens from public,anon,authenticated;
create function public.set_social_push(push_token text) returns void language plpgsql security definer set search_path='' as $$
 begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if push_token is null then delete from public.social_push_tokens where user_id=auth.uid();
  else insert into public.social_push_tokens values(auth.uid(),push_token) on conflict(user_id) do update set token=excluded.token; end if;
 end;
$$;
alter table public.social_notifications add column claimed_until timestamptz;
create function public.claim_social_pushes() returns table(id uuid,token text,kind text,circle_id uuid)
 language plpgsql security definer set search_path='' as $$
 begin
  return query with pending as (
   select n.id,t.token from public.social_notifications n join public.social_push_tokens t on t.user_id=n.user_id
   where n.delivered_at is null and n.deliver_after<=now() and (n.claimed_until is null or n.claimed_until<now())
   and not exists(select 1 from public.social_blocks b where (b.user_id=n.user_id and b.blocked_id=n.actor_id) or (b.blocked_id=n.user_id and b.user_id=n.actor_id))
   and ((n.kind='invite' and exists(select 1 from public.circle_requests r where r.id=n.reference_id and r.status='pending' and r.expires_at>now()))
    or (n.kind='seal' and exists(select 1 from public.sealed_forecasts s where s.id=n.reference_id and not s.revoked and s.opened_at is null))
    or (n.kind in ('joined','forecast','vote') and exists(select 1 from public.circle_members m where m.circle_id=n.circle_id and m.user_id=n.user_id)))
   order by n.deliver_after limit 100 for update of n skip locked
  ), claimed as (update public.social_notifications n set claimed_until=now()+interval '5 minutes' from pending p where n.id=p.id returning n.id,n.kind,n.circle_id)
  select c.id,p.token,c.kind,c.circle_id from claimed c join pending p on p.id=c.id;
 end;
$$;
create function public.finish_social_push(notification uuid) returns void language sql security definer set search_path='' as $$
 update public.social_notifications set delivered_at=now() where id=notification;
$$;
revoke all on function public.set_social_push(text) from public,anon;
grant execute on function public.set_social_push(text) to authenticated;
revoke all on function public.claim_social_pushes(),public.finish_social_push(uuid) from public,anon,authenticated;
grant execute on function public.claim_social_pushes(),public.finish_social_push(uuid) to service_role;

create or replace function public.school_circle_suggestions() returns table(circle_id uuid,user_id uuid)
 language sql stable security definer set search_path='' as $$
 select distinct edge.circle_id,peer.user_id from public.circle_connections edge
 join public.social_profiles mine on mine.user_id=auth.uid()
 join public.social_profiles peer on peer.user_id=case when edge.inviter_id=auth.uid() then edge.invitee_id else edge.inviter_id end and peer.school_id=mine.school_id
 where auth.uid() in (edge.inviter_id,edge.invitee_id) and social_private.member(edge.circle_id) and not social_private.blocked(peer.user_id)
 order by edge.circle_id,peer.user_id;
$$;
