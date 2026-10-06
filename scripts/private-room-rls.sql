\set QUIET 1
-- Runs after social-rls.sql (proof schema, fixture users). Rolled back; leaves fixtures untouched.
begin;
delete from public.social_blocks;
update public.social_profiles set plus=false,plus_until=null;
insert into public.circles(id,owner_id) values('90000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001');
insert into public.circle_members(circle_id,user_id) values
 ('90000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001'),
 ('90000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'),
 ('90000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003');
insert into public.circle_forecast_drafts(id,user_id,circle_id,question,headline,due_date) values
 ('90000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','Will we learn together?','A creative project may bring you together.',current_date);
insert into public.circle_forecasts(id,circle_id,asker_id,question,headline,due_date) values
 ('90000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Will we learn together?','A creative project may bring you together.',current_date);
set role authenticated;
-- Only a Plus owner can open the room; anyone may never toggle another owner's Circle.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select proof.reject($q$select public.set_private_room('90000000-0000-0000-0000-000000000001',true)$q$,'P0001');
select proof.reject($q$update public.circles set private_room=true$q$,'42501');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select proof.reject($q$select public.set_private_room('90000000-0000-0000-0000-000000000001',true)$q$,'P0001');
reset role;
update public.social_profiles set plus_until=now()+interval '1 week' where user_id='00000000-0000-0000-0000-000000000001';
set role authenticated;
select public.set_private_room('90000000-0000-0000-0000-000000000001',true);
select public.vote_circle_forecast('90000000-0000-0000-0000-000000000002','yes');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select proof.assert((select count(*)=1 from public.private_rooms()),'members see the live room');
select public.vote_circle_forecast('90000000-0000-0000-0000-000000000002','no');
select proof.assert((select sealed and yes is null and no is null and pending is null and mine='no' from public.circle_vote_tallies()),'sealed room hides counts but keeps own vote');
select proof.reject('select * from public.circle_votes','42501');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
select public.vote_circle_forecast('90000000-0000-0000-0000-000000000002','pending');
select proof.assert((select not sealed and yes=1 and no=1 and pending=1 from public.circle_vote_tallies()),'everyone voting reveals the tally');
reset role;
delete from public.circle_votes where user_id='00000000-0000-0000-0000-000000000003';
set role authenticated;
select proof.assert((select sealed from public.circle_vote_tallies()),'a missing vote keeps it sealed on the due day');
reset role;
update public.circle_forecasts set due_date=current_date-1;
set role authenticated;
select proof.assert((select not sealed and yes=1 and no=1 from public.circle_vote_tallies()),'the day after the due date reveals the tally');
reset role;
update public.circle_forecasts set due_date=current_date;
update public.social_profiles set plus_until=now()-interval '1 second' where user_id='00000000-0000-0000-0000-000000000001';
set role authenticated;
select proof.assert((select not sealed and yes=1 from public.circle_vote_tallies()),'owner Plus lapse reopens the tally');
select proof.assert((select count(*)=0 from public.private_rooms()),'lapsed room is not live');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.set_private_room('90000000-0000-0000-0000-000000000001',false);
reset role;
select proof.assert((select not private_room from public.circles where id='90000000-0000-0000-0000-000000000001'),'owner can close the room without Plus');
set role anon;
select proof.reject('select * from public.private_rooms()','42501');
select proof.reject($q$select public.set_private_room('90000000-0000-0000-0000-000000000001',true)$q$,'42501');
reset role;
rollback;
\echo 'PASS: private Circle rooms are Plus-owner only, seal tallies until everyone votes or the due day ends, and reopen on lapse'
