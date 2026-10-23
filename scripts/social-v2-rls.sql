\set QUIET 1
begin;
delete from public.circles;
delete from public.social_blocks;
update public.social_profiles set plus=false,plus_until=null,school_id=null;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.set_social_identity('adult_one','Adult One','☀️');
select public.set_school('sfusd-lowell');
select public.create_circle() as c \gset
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.set_social_identity('adult_two','Adult Two','🌙');
select proof.reject($q$select public.set_social_identity('ADULT_ONE','Duplicate','🌙')$q$,'23505');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
select public.set_social_identity('teen_one','Teen One','🌊');
select public.set_school('sfusd-lowell');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.set_social_identity('teen_unknown','Unknown','✦');
select proof.assert((select count(*)=0 from public.search_handles('teen')),'no-school viewer cannot discover teens');
select public.set_school('sfusd-lowell');
select proof.assert((select count(*)=0 from public.search_handles('@teen')),'unknown age cannot discover teens at the same school');
reset role;
update public.social_profiles set age_band='teen' where user_id='00000000-0000-0000-0000-000000000004';
set role authenticated;
select proof.assert((select count(*)=1 from public.search_handles('@teen')),'explicit teens can discover teens at the same school');
select proof.assert((select array_agg(k order by k)=array['avatar','display_name','handle'] from public.search_handles('teen') s,lateral jsonb_object_keys(to_jsonb(s)) k),'search exposes only identity, never sign or ID');
select public.set_school(null);
reset role;
update public.social_profiles set age_band='unknown' where user_id='00000000-0000-0000-0000-000000000004';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select proof.assert((select count(*)=0 from public.search_handles('teen')),'adult at school cannot discover teens');
select proof.reject(format('select public.request_circle_invite(%L,''teen_one'')',:'c'),'P0001');
reset role;
savepoint discovery_matrix;
do $$
declare viewer_age text; target_age text; school text; target_school text; allowed boolean; target_circle uuid;
begin
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
 target_circle:=public.create_circle();
 foreach viewer_age in array array['adult','teen','unknown'] loop
  foreach target_age in array array['adult','teen','unknown'] loop
   foreach school in array array['sfusd-lowell','sfusd-washington',null] loop
   foreach target_school in array array['sfusd-lowell','sfusd-washington',null] loop
    update public.social_profiles set age_band=viewer_age,school_id=school where user_id=auth.uid();
    update public.social_profiles set age_band=target_age,school_id=target_school where handle='teen_one';
    allowed:=target_age='adult' or (target_age='teen' and viewer_age='teen' and coalesce(school=target_school,false));
    perform proof.assert((select count(*) from public.search_handles('teen_one'))=case when allowed then 1 else 0 end,'age/school search matrix');
    if allowed then
     perform public.request_circle_invite(target_circle,'teen_one');
     perform proof.assert(exists(select 1 from public.circle_requests where circle_id=target_circle),'discoverable target receives invitation');
     delete from public.circle_requests where circle_id=target_circle;
     perform public.block_handle('teen_one');
     perform proof.assert((select count(*)=0 from public.search_handles('teen_one')),'block hides discoverable target');
     delete from public.social_blocks where user_id=auth.uid();
    else
     perform proof.reject(format('select public.request_circle_invite(%L,''teen_one'')',target_circle),'P0001');
     perform proof.reject('select public.block_handle(''teen_one'')','P0001');
    end if;
   end loop;
   end loop;
  end loop;
 end loop;
end;
$$;
rollback to discovery_matrix;
set role authenticated;
select public.request_circle_invite(:'c','adult_two');
select proof.reject('select * from public.circle_requests','42501');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select id as request from public.circle_inbox() \gset
select public.answer_circle_invite(:'request',false);
select proof.assert((select count(*)=0 from public.circles),'declining never joins');
reset role;
select proof.assert((select count(*)=0 from public.social_notifications where user_id='00000000-0000-0000-0000-000000000001'),'decline sends nothing');
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.request_circle_invite(:'c','adult_two');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select id as request from public.circle_inbox() \gset
select public.answer_circle_invite(:'request',true);
select proof.reject(format('select public.answer_circle_invite(%L,true)',:'request'),'P0001');
select public.circle_checkin('growth');
select proof.assert((select count(*)=0 from public.circle_glows),'not every member consulted yet');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.circle_checkin('learning');
select proof.assert((select count(*)=1 from public.circle_glows),'all members produce glow');
-- A golden draw is shareable only when the forecast server recorded it; clients cannot record one.
select proof.reject($q$select public.share_circle_moment('30000000-0000-0000-0000-000000000001','golden')$q$,'P0001');
select proof.reject($q$insert into public.golden_forecasts values(auth.uid(),'30000000-0000-0000-0000-000000000001')$q$,'42501');
reset role;
insert into public.golden_forecasts(user_id,reading_id) values('00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002');
set role authenticated;
select proof.assert((select count(*)=1 from public.golden_forecasts),'only your own golden records are readable');
select public.share_circle_moment('30000000-0000-0000-0000-000000000001','golden');
select public.share_circle_moment('30000000-0000-0000-0000-000000000001','yes');
select proof.assert((select count(*)=2 from public.circle_moments),'golden and check-in without content');
select proof.reject(format('select public.react_in_circle(%L,%L,''custom text'')',:'c','00000000-0000-0000-0000-000000000002'),'23514');
select public.react_in_circle(:'c','00000000-0000-0000-0000-000000000002','❤️');
select proof.reject('insert into public.circle_forecast_drafts(user_id,circle_id,question,headline,due_date) values(auth.uid(),gen_random_uuid(),''Unsafe question'',''Bypass moderation'',current_date+1)','42501');
reset role;
insert into public.circle_forecast_drafts(id,user_id,circle_id,question,headline,due_date) values
 ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',:'c','Will we learn together?','A creative project may bring you together.',current_date+1),
 ('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',:'c','Will we travel together?','A new place may spark shared curiosity.',current_date+1);
set role authenticated;
select public.publish_circle_forecast('40000000-0000-0000-0000-000000000001');
select proof.assert((select charged_at is not null from public.circle_forecasts where id='40000000-0000-0000-0000-000000000001'),'publication is charged server-side');
select proof.reject('update public.circle_forecasts set charged_at=now()','42501');
select proof.reject('select public.mark_circle_charged(''40000000-0000-0000-0000-000000000001'')','42883');
reset role;
select proof.assert((select count(*)=1 from public.reading_charges where user_id='00000000-0000-0000-0000-000000000001' and reading_id='40000000-0000-0000-0000-000000000001'),'publication charged the asker one reading');
set role authenticated;

select public.publish_circle_forecast('40000000-0000-0000-0000-000000000001');
select proof.reject('select public.publish_circle_forecast(''40000000-0000-0000-0000-000000000002'')','P0001');
select proof.reject('select public.vote_circle_forecast(''40000000-0000-0000-0000-000000000001'',''yes'')','P0001');
reset role;
update public.circle_forecasts set due_date=current_date;
set role authenticated;
select public.vote_circle_forecast('40000000-0000-0000-0000-000000000001','yes');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.vote_circle_forecast('40000000-0000-0000-0000-000000000001','pending');
select proof.assert((select yes=1 and pending=1 and mine='pending' from public.circle_vote_tallies()),'members see tally and own vote');
select proof.reject(format('select public.manage_circle(%L,%L,''remove'')',:'c','00000000-0000-0000-0000-000000000001'),'P0001');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.invite_to_circle(:'c') as transfer_invite \gset
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.join_circle(:'transfer_invite');
select public.set_school('sfusd-lowell');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.set_school('sfusd-lowell');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.manage_circle(:'c','00000000-0000-0000-0000-000000000002','transfer');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select proof.assert(not exists(select 1 from public.school_circle_suggestions() where user_id='00000000-0000-0000-0000-000000000004'),'ownership transfer does not invent a direct invitation relationship');
select public.manage_circle(:'c','00000000-0000-0000-0000-000000000004','remove');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';

select public.leave_circle(:'c');
select proof.assert((select count(*)=0 from public.circle_forecasts),'leaving removes forecast visibility');
select proof.assert((select count(*)=0 from public.circle_vote_tallies()),'leaving removes tally');
select public.block_handle('adult_two');
select proof.assert((select count(*)=0 from public.search_handles('adult_two')),'block hides search');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select proof.assert((select count(*)=0 from public.search_handles('adult_one')),'block hides reverse search');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$ begin for i in 1..5 loop perform public.create_circle(); end loop; end $$;
select proof.reject('select public.create_circle()','P0001');
reset role;
update public.social_profiles set plus=true,plus_until=now()+interval '1 week' where user_id='00000000-0000-0000-0000-000000000003';
set role authenticated;
do $$ begin for i in 1..5 loop perform public.create_circle(); end loop; end $$;
select proof.reject('select public.create_circle()','P0001');
reset role;
-- Targeted cards cannot be claimed by a different Circle member or link visitor.
delete from public.social_blocks;
update public.social_profiles set plus=true,plus_until=now()+interval '1 week' where user_id='00000000-0000-0000-0000-000000000001';
insert into public.circle_members(circle_id,user_id) values(:'c','00000000-0000-0000-0000-000000000001');
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.send_sealed_forecast('20000000-0000-0000-0000-000000000001',:'c','00000000-0000-0000-0000-000000000002') as direct_seal \gset
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select proof.reject(format('select public.open_forecast(%L)',:'direct_seal'),'P0001');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select proof.assert((select count(*)=1 from public.sealed_inbox()),'inbox exposes tokens without headlines');
select proof.assert(public.open_forecast(:'direct_seal')='Your next chapter will bring a new skill.','intended recipient opens targeted card');
select public.set_social_push('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
select proof.reject('select public.claim_social_pushes()','42501');
reset role;
set role service_role;
select proof.assert((select count(*)>0 from public.claim_social_pushes()),'trusted worker can lease allowed notifications');
select proof.assert((select count(*)=0 from public.claim_social_pushes()),'active delivery lease prevents duplicate concurrent claims');
reset role;
-- Twenty pending requests per sender/day; a decline releases one pending slot.
insert into auth.users select ('60000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid from generate_series(1,21) i;
insert into public.social_profiles(user_id,age_band,handle,display_name) select id,'adult','limit_'||right(id::text,2),'Limit user' from auth.users where id::text like '60000000%';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select set_config('proof.circle',:'c',false);
do $$ begin for i in 1..20 loop perform public.request_circle_invite(current_setting('proof.circle')::uuid,'limit_'||lpad(i::text,2,'0')); end loop; end $$;
select proof.reject(format('select public.request_circle_invite(%L,''limit_21'')',:'c'),'P0001');
set request.jwt.claim.sub='60000000-0000-0000-0000-000000000001';
select id as limit_request from public.circle_inbox() \gset
select public.answer_circle_invite(:'limit_request',false);
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.request_circle_invite(:'c','limit_21');
set role anon;
select proof.reject('select public.search_handles(''adult'')','42501');
select proof.reject('select * from public.circle_forecasts','42501');
reset role;
rollback;
\echo 'PASS: social v2 discovery, silent requests, caps, ownership, glow, fixed reactions, receipt-only forecasts, due voting and visibility'
