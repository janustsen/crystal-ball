\set QUIET 1
begin;
reset role;
delete from public.social_blocks;
delete from public.star_reports;
update public.sky_stars set withdrawn=false;
set role anon;
select proof.reject('select * from public.schools','42501');
select proof.reject('select public.set_school(''sfusd-lowell'')','42501');
select proof.reject('select * from public.tonights_sky(true)','42501');
select proof.reject('select * from public.school_circle_suggestions()','42501');
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.set_school('sfusd-lowell');
select proof.assert((select school_id='sfusd-lowell' from public.social_profiles),'school stored on own profile');
reset role;
set role service_role;
select public.sync_social_profile(user_id,age_band,sun_sign,null) from public.social_profiles where user_id='00000000-0000-0000-0000-000000000001';
reset role;
set role authenticated;
select proof.assert((select school_id='sfusd-lowell' from public.social_profiles),'profile sync preserves school');
select proof.reject('update public.social_profiles set school_id=''sfusd-lincoln''','42501');
select proof.reject('select public.set_school(''invented-school'')','23503');
select public.create_circle() as school_circle \gset
select public.invite_to_circle(:'school_circle') as school_invite \gset
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.set_school('sfusd-lowell');
select public.join_circle(:'school_invite');
select proof.assert((select count(*)>0 from public.tonights_sky(true)),'same school sees approved stars');
select proof.assert((select count(*)=1 from public.social_profiles),'other school_ids remain private');
select proof.assert(exists(select 1 from public.school_circle_suggestions() where circle_id=:'school_circle' and user_id='00000000-0000-0000-0000-000000000001'),'accepted direct invite enables suggestion');
select proof.assert((select array_agg(k order by k)=array['id','mine','resonances','resonated','theme','wording'] from (select * from public.tonights_sky(true) limit 1) s,lateral jsonb_object_keys(to_jsonb(s)) k),'school sky has no identity or school columns');
select public.set_school('sfusd-lincoln');
select proof.assert((select count(*)=0 from public.tonights_sky(true)),'other school stars excluded');
select proof.assert((select count(*)>0 from public.tonights_sky()),'global sky unchanged');
select proof.assert((select count(*)=0 from public.school_circle_suggestions()),'different school no suggestions');
select public.set_school(null);
select proof.assert((select count(*)=0 from public.tonights_sky(true)),'no school never falls back to global sky');
select public.set_school('sfusd-lowell');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
select public.set_school('sfusd-lowell');
select proof.reject('select public.set_friend_consent(true)','P0001');
-- User 3 shares existing circles with 2, but only 1 invited either of them.
select proof.assert(not exists(select 1 from public.school_circle_suggestions() where user_id='00000000-0000-0000-0000-000000000002'),'fellow members are not direct invite relationships');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.set_school('sfusd-lowell');
select proof.assert(not exists(select 1 from public.school_circle_suggestions() where circle_id=:'school_circle'),'same-school outsider cannot discover private circle');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.block_person(member=>'00000000-0000-0000-0000-000000000001');
select proof.assert((select count(*)=0 from public.tonights_sky(true)),'blocked school stars excluded');
select proof.assert(not exists(select 1 from public.school_circle_suggestions() where user_id='00000000-0000-0000-0000-000000000001'),'blocked school suggestions excluded');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select proof.assert(not exists(select 1 from public.school_circle_suggestions() where user_id='00000000-0000-0000-0000-000000000002'),'reverse block hides suggestions');
reset role;
delete from public.social_blocks;
insert into public.star_reports select id,'00000000-0000-0000-0000-000000000002' from public.sky_stars where day=(now() at time zone 'UTC')::date;
insert into public.star_reports select id,'00000000-0000-0000-0000-000000000003' from public.sky_stars where day=(now() at time zone 'UTC')::date;
insert into public.star_reports select id,'00000000-0000-0000-0000-000000000004' from public.sky_stars where day=(now() at time zone 'UTC')::date;
set role authenticated;
select proof.assert((select count(*)=0 from public.tonights_sky(true)),'moderation still hides reported school stars');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.leave_circle(:'school_circle');
select proof.assert(not exists(select 1 from public.school_circle_suggestions() where circle_id=:'school_circle'),'leaving removes suggestion');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.create_school_circle_invite() as retry_invite \gset
select proof.assert(public.create_school_circle_invite(:'retry_invite')=:'retry_invite','valid retry keeps its invitation');
reset role;
select circle_id as retry_circle from public.circle_invites where token=:'retry_invite' \gset
set role authenticated;
select public.leave_circle(:'retry_circle');
select public.create_school_circle_invite(:'retry_invite') as after_close \gset
select proof.assert(:'after_close'<>:'retry_invite','closed circle gets a fresh invitation');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.join_circle(:'after_close') as joined_circle \gset
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.create_school_circle_invite(:'after_close') as after_join \gset
select proof.assert(:'after_join'<>:'after_close','consumed invitation is replaced');
reset role;
select proof.assert((select circle_id<>:'joined_circle' from public.circle_invites where token=:'after_join'),'consumed retry creates a separate circle');
update public.circle_invites set expires_at=now()-interval '1 second' where token=:'after_join';
set role authenticated;
select public.create_school_circle_invite(:'after_join') as after_expiry \gset
select proof.assert(:'after_expiry'<>:'after_join','expired invitation is replaced');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.create_school_circle_invite(:'after_expiry') as other_owner \gset
select proof.assert(:'other_owner'<>:'after_expiry','another owner cannot reuse an invitation');
reset role;
select circle_id as occupied_circle from public.circle_invites where token=:'after_expiry' \gset
insert into public.circle_members(circle_id,user_id) values(:'occupied_circle','00000000-0000-0000-0000-000000000002');
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.block_person(member=>'00000000-0000-0000-0000-000000000002');
select public.create_school_circle_invite(:'after_expiry') as after_hidden_member \gset
select proof.assert(:'after_hidden_member'<>:'after_expiry','hidden member prevents circle reuse');
reset role;
select proof.assert((select circle_id<>:'occupied_circle' from public.circle_invites where token=:'after_hidden_member'),'hidden member retry creates a separate circle');
set role anon;
select proof.reject('select public.create_school_circle_invite()','42501');
reset role;
set role authenticated;
set request.jwt.claim.sub='';
select proof.reject('select public.create_school_circle_invite()','P0001');
rollback;
\echo 'PASS: school profile RLS, catalog validation, filtered anonymous sky, direct invitation-only suggestions, teen consent, blocks, reports, leaving'
