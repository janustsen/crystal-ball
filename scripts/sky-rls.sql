\set QUIET 1
begin;
delete from public.sky_omens;
insert into auth.users values ('a0000000-0000-0000-0000-000000000001'),('a0000000-0000-0000-0000-000000000002'),('a0000000-0000-0000-0000-000000000003');
insert into public.social_profiles(user_id,age_band,school_id) values
 ('a0000000-0000-0000-0000-000000000001','adult','sfusd-lowell'),
 ('a0000000-0000-0000-0000-000000000002','teen','sfusd-washington'),
 ('a0000000-0000-0000-0000-000000000003','adult',null);
insert into public.circles(id,owner_id) values ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003');
insert into public.circle_members(circle_id,user_id) values ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003');

select proof.assert(social_private.sky_week('America/New_York','2026-10-09 19:59-04')='2026-10-02','Friday 19:59 local still shows last week');
select proof.assert(social_private.sky_week('America/New_York','2026-10-09 20:00-04')='2026-10-09','Friday 20:00 local opens this week');
select proof.assert(social_private.sky_week('Pacific/Kiritimati','2026-10-09 06:00Z')='2026-10-09','the earliest zone opens Friday 06:00 UTC');
select proof.assert(social_private.sky_week('Etc/GMT+12','2026-10-10 07:59Z')='2026-10-02','the latest zone is still on last week');
select proof.assert(social_private.sky_week('UTC','2026-10-15 12:00Z')='2026-10-09','Thursday shows the week opened last Friday');

-- Generation targets populated schools and every Circle once per week.
set role service_role;
select proof.assert((select count(*)=3 from public.sky_omen_targets('2026-10-09') where school_id in ('sfusd-lowell','sfusd-washington') or circle_id='a1000000-0000-0000-0000-000000000001'),'targets: populated schools and each Circle');
select proof.assert((select count(*)=0 from public.sky_omen_targets('2026-10-09') where school_id='sfusd-lincoln'),'an empty school is not a target');
select public.save_sky_omen('2026-10-09','sfusd-lowell',null,'A bright shared spark gathers over your hallways tonight.');
select public.save_sky_omen('2026-10-09','sfusd-lowell',null,'A second omen must never replace the first one.');
select proof.assert((select omen from public.sky_omens where school_id='sfusd-lowell')='A bright shared spark gathers over your hallways tonight.','one omen per school per week');
select proof.assert((select count(*)=0 from public.sky_omen_targets('2026-10-09') where school_id='sfusd-lowell'),'saved groups are no longer targets');
reset role;
select proof.reject($q$insert into public.sky_omens(week,school_id,omen) values('2026-10-08','sfusd-lincoln','Thursday is not a Sky night.')$q$,'23514');
select proof.reject($q$insert into public.sky_omens(week,school_id,circle_id,omen) values('2026-10-09','sfusd-lincoln','a1000000-0000-0000-0000-000000000001','One omen belongs to one group.')$q$,'23514');

-- Visibility: the current local week only, own School or own Circle only.
delete from public.sky_omens;
select social_private.sky_week('America/Los_Angeles',now()) as week \gset
insert into public.sky_omens(week,school_id,circle_id,omen) values
 (:'week','sfusd-lowell',null,'Lowell omen for this week only.'),
 (:'week','sfusd-washington',null,'Washington omen for this week only.'),
 (:'week',null,'a1000000-0000-0000-0000-000000000001','Circle omen for this week only.'),
 ((:'week')::date+7,'sfusd-washington',null,'Next week stays sealed until Friday.');
set role authenticated;
set request.jwt.claim.sub='a0000000-0000-0000-0000-000000000002';
select proof.assert((select array_agg(omen)=array['Washington omen for this week only.'] from public.open_sky('America/Los_Angeles')),'a teen sees only their own school omen');
select proof.reject('select * from public.sky_omens','42501');
select proof.reject($q$select * from public.sky_omen_targets('2026-10-09')$q$,'42501');
select proof.reject($q$select public.save_sky_omen('2026-10-09','sfusd-lincoln',null,'Clients cannot write omens.')$q$,'42501');
select proof.reject('select * from public.claim_sky_pushes()','42501');
select proof.assert((select time_zone='America/Los_Angeles' from public.social_profiles),'opening the Sky saves the viewer clock');
select proof.assert((select count(*)=1 from public.open_sky('Not/AZone')),'an unknown zone is ignored, not fatal');
select proof.assert((select time_zone='America/Los_Angeles' from public.social_profiles),'an unknown zone keeps the saved clock');
set request.jwt.claim.sub='a0000000-0000-0000-0000-000000000001';
select proof.assert((select array_agg(omen)=array['Lowell omen for this week only.'] from public.open_sky('America/Los_Angeles')),'an adult sees only their own school omen');
set request.jwt.claim.sub='a0000000-0000-0000-0000-000000000003';
select proof.assert((select array_agg(omen)=array['Circle omen for this week only.'] from public.open_sky('America/Los_Angeles')),'a member sees their Circle omen and no school omen');
select proof.assert((select not sky_push and not sky_push_answered from public.social_profiles),'the Sky push defaults off and unanswered');
select public.set_sky_push(false);
select proof.assert((select not sky_push and sky_push_answered from public.social_profiles),'dismissing persists the answer without enabling pushes');
select public.set_sky_push(true);
select proof.assert((select sky_push and sky_push_answered from public.social_profiles),'explicit opt-in persists both preference and answer');
select public.set_sky_push(false);
select proof.assert((select not sky_push and sky_push_answered from public.social_profiles),'turning off later does not reset the prompt');
reset role;

-- Push queue: account with a token, a clock, an omen and the toggle on, at or after local Friday 20:00.
delete from public.sky_omens;
insert into public.sky_omens(week,school_id,omen) values('2026-10-09','sfusd-lowell','Lowell omen for the push week.'),('2026-10-09','sfusd-washington','Washington omen for the push week.');
update public.social_profiles set time_zone='America/New_York' where user_id in ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002');
insert into public.social_push_tokens values
 ('a0000000-0000-0000-0000-000000000001','ExpoPushToken[sky-one]'),('a0000000-0000-0000-0000-000000000002','ExpoPushToken[sky-two]');
select social_private.queue_sky_pushes('2026-10-09 19:59-04');
select proof.assert((select count(*)=0 from public.sky_pushes),'nothing queues before 20:00 local');
select social_private.queue_sky_pushes('2026-10-09 20:01-04');
select proof.assert((select count(*)=0 from public.sky_pushes),'a token, clock and visible omen do not enroll either account');
set role authenticated;
set request.jwt.claim.sub='a0000000-0000-0000-0000-000000000001';
select public.set_sky_push(true);
reset role;
select social_private.queue_sky_pushes('2026-10-09 20:01-04');
select social_private.queue_sky_pushes('2026-10-09 21:30-04');
select proof.assert((select array_agg(user_id::text)=array['a0000000-0000-0000-0000-000000000001'] and min(week)='2026-10-09' from public.sky_pushes),'one push per account per week');
select social_private.queue_sky_pushes('2026-10-10 20:01-04');
select proof.assert((select count(*)=1 from public.sky_pushes),'Saturday never queues');

-- Lease: deliver only on that same local evening, once per lease, and never after opting out.
select (extract(epoch from ((now() at time zone 'UTC')-(date_trunc('week',now() at time zone 'UTC')+interval '4 days 20 hours 30 minutes')))/3600)::int as zone_offset \gset
select 'SKY'||(:zone_offset)::text as friday_zone,'SKY'||(:zone_offset+2)::text as early_zone,'SKY'||(:zone_offset-24)::text as saturday_zone \gset
update public.social_profiles set time_zone=:'friday_zone' where user_id='a0000000-0000-0000-0000-000000000001';
update public.sky_pushes set week=(now() at time zone :'friday_zone')::date;
update public.sky_omens set week=(now() at time zone :'friday_zone')::date;
set role service_role;
select proof.assert((select count(*)=1 from public.claim_sky_pushes() where kind='sky' and token='ExpoPushToken[sky-one]' and circle_id is null),'the worker leases a generic Sky push');
select proof.assert((select count(*)=0 from public.claim_sky_pushes()),'an active lease prevents duplicate claims');
reset role;
update public.sky_pushes set claimed_until=null;
update public.social_profiles set school_id=null where user_id='a0000000-0000-0000-0000-000000000001';
set role service_role;
select proof.assert((select count(*)=0 from public.claim_sky_pushes()),'removing the only school suppresses retry');
reset role;
insert into public.sky_omens(week,circle_id,omen) values((now() at time zone :'friday_zone')::date,'a1000000-0000-0000-0000-000000000001','A Circle omen keeps the opening available.');
insert into public.circle_members(circle_id,user_id) values('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001');
set role service_role;
select proof.assert((select count(*)=1 from public.claim_sky_pushes()),'a remaining Circle omen permits retry without a school');
reset role;
update public.sky_pushes set claimed_until=null;
delete from public.circle_members where user_id='a0000000-0000-0000-0000-000000000001';
set role service_role;
select proof.assert((select count(*)=0 from public.claim_sky_pushes()),'leaving the only Circle suppresses retry');
reset role;
update public.social_profiles set school_id='sfusd-lowell',time_zone=:'early_zone' where user_id='a0000000-0000-0000-0000-000000000001';
set role service_role;
select proof.assert((select count(*)=0 from public.claim_sky_pushes()),'moving back before 20:00 suppresses retry');
reset role;
update public.social_profiles set time_zone=:'saturday_zone' where user_id='a0000000-0000-0000-0000-000000000001';
update public.sky_pushes set week=(now() at time zone :'saturday_zone')::date;
set role service_role;
select proof.assert((select count(*)=0 from public.claim_sky_pushes()),'Saturday does not claim even a matching queue date');
reset role;
update public.social_profiles set time_zone=:'friday_zone' where user_id='a0000000-0000-0000-0000-000000000001';
update public.sky_pushes set week=(now() at time zone :'friday_zone')::date;

update public.social_profiles set sky_push=false where user_id='a0000000-0000-0000-0000-000000000001';
set role service_role;
select proof.assert((select count(*)=0 from public.claim_sky_pushes()),'turning the Sky push off cancels a queued push');
reset role;
update public.social_profiles set sky_push=true where user_id='a0000000-0000-0000-0000-000000000001';
set role service_role;
select proof.assert((select count(*)=1 from public.claim_sky_pushes()),'restoring current eligibility permits the expired lease');
select public.finish_sky_push(id) from public.sky_pushes where user_id='a0000000-0000-0000-0000-000000000001';
reset role;
update public.sky_pushes set claimed_until=null;
set role service_role;
select proof.assert((select count(*)=0 from public.claim_sky_pushes()),'an acknowledged delivery cannot be retried');
reset role;
select id as missed_id from public.sky_pushes where user_id='a0000000-0000-0000-0000-000000000001' \gset
update public.sky_pushes set delivered_at=null,week=week-7;
set role service_role;
select proof.assert((select count(*)=0 from public.claim_sky_pushes() where id=:'missed_id'),'a missed Friday evening is never delivered late');
reset role;

-- Separate consent on one shared token: Friday opt-in never enables Circle pushes; Circle off never stops Friday.
delete from public.social_push_tokens where user_id='a0000000-0000-0000-0000-000000000003';
insert into public.circle_members(circle_id,user_id) values ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003') on conflict do nothing;
insert into public.sky_omens(week,circle_id,omen) values('2026-10-09','a1000000-0000-0000-0000-000000000001','Circle omen for the push week.') on conflict do nothing;
insert into public.social_notifications(user_id,actor_id,circle_id,kind,reference_id,deliver_after)
 values('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','joined',gen_random_uuid(),'2000-01-01');
set role authenticated;
set request.jwt.claim.sub='a0000000-0000-0000-0000-000000000003';
select public.set_sky_push(true,'ExpoPushToken[sky-three]');
reset role;
select proof.assert((select not circle_push from public.social_push_tokens where user_id='a0000000-0000-0000-0000-000000000003'),'Friday opt-in registers the token without Circle consent');
set role service_role;
select proof.assert((select count(*)=0 from public.claim_social_pushes() where token='ExpoPushToken[sky-three]'),'Friday-only consent receives no Circle push');
reset role;
set role authenticated;
set request.jwt.claim.sub='a0000000-0000-0000-0000-000000000003';
select public.set_social_push('ExpoPushToken[sky-three]');
reset role;
set role service_role;
select proof.assert((select count(*)>0 from public.claim_social_pushes() where token='ExpoPushToken[sky-three]'),'explicit Circle consent receives Circle pushes');
reset role;
set role authenticated;
set request.jwt.claim.sub='a0000000-0000-0000-0000-000000000003';
select public.set_social_push(null);
reset role;
update public.social_profiles set time_zone='America/New_York' where user_id='a0000000-0000-0000-0000-000000000003';
select proof.assert((select not t.circle_push and p.sky_push from public.social_push_tokens t join public.social_profiles p using(user_id) where user_id='a0000000-0000-0000-0000-000000000003'),'Circle off keeps the token and Friday consent');
select social_private.queue_sky_pushes('2026-10-09 20:01-04');
select proof.assert((select count(*)=1 from public.sky_pushes where user_id='a0000000-0000-0000-0000-000000000003' and week='2026-10-09'),'Friday still queues after Circle notifications are turned off');
rollback;
\echo 'PASS: Friday Sky week math, one omen per group, own-school and own-Circle visibility, service-only generation and once-per-week push lease'
