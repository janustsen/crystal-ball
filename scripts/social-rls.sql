\set QUIET 1
create schema proof;
create function proof.assert(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; end;
$$;
create function proof.reject(statement text,expected_state text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when others then
  if sqlstate=expected_state then return; end if;
  raise;
 end;
 raise exception 'FAIL: statement was allowed: %',statement;
end;
$$;
grant usage on schema proof to authenticated,anon,service_role;
grant execute on all functions in schema proof to authenticated,anon,service_role;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003'),('00000000-0000-0000-0000-000000000004');
insert into public.social_profiles(user_id,age_band,sun_sign) values
 ('00000000-0000-0000-0000-000000000001','adult','aries'),
 ('00000000-0000-0000-0000-000000000002','adult','leo'),
 ('00000000-0000-0000-0000-000000000003','teen','taurus');
insert into public.social_drafts(id,user_id,kind,wording,theme) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','star','Will a new skill bring a new opportunity?','learning'),
 ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','seal','Your next chapter will bring a new skill.','growth');
set role anon;
select proof.reject('select * from public.tonights_sky()','42501');
select proof.reject('select * from public.circle_members','42501');
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.publish_star('10000000-0000-0000-0000-000000000001') as star \gset
select public.create_circle() as circle \gset
select public.invite_to_circle(:'circle') as invite \gset
select public.seal_forecast('20000000-0000-0000-0000-000000000001') as seal \gset
select proof.reject('select public.publish_star(''10000000-0000-0000-0000-000000000099'')','P0001');
select proof.reject('insert into public.social_drafts(user_id,kind,wording,theme) values(auth.uid(),''star'',''Bypass AI filter'',''love'')','42501');
select proof.reject('insert into public.sky_stars(user_id,theme,wording,draft_id) values(auth.uid(),''work'',''Private text'',''10000000-0000-0000-0000-000000000001'')','42501');
select proof.assert((select count(*)=1 from public.sky_stars),'one private star');
select public.publish_star('10000000-0000-0000-0000-000000000001');
select proof.assert((select count(*)=1 from public.sky_stars),'daily publication is idempotent');
select proof.assert((select consulted_on is null from public.circle_members),'no historical check-in backfill');
select public.circle_checkin('work');
select proof.reject(format('select public.open_forecast(%L)',:'seal'),'P0001');

set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
select proof.assert((select count(*)=0 from public.sky_stars),'outsider cannot see sky owners');
select proof.assert((select count(*)=0 from public.circles),'outsider cannot enumerate circles');
select proof.assert((select count(*)=0 from public.circle_members),'outsider cannot enumerate members');
select proof.assert((select count(*)=0 from public.sealed_forecasts),'outsider cannot read sealed payloads');
select proof.reject('select * from public.circle_invites','42501');
select proof.reject(format('select public.invite_to_circle(%L)',:'circle'),'P0001');
select proof.reject(format('select public.react_in_circle(%L,%L)',:'circle','00000000-0000-0000-0000-000000000001'),'P0001');
select proof.assert((select array_agg(k order by k)=array['id','mine','resonances','resonated','theme','wording'] from public.tonights_sky() s, lateral jsonb_object_keys(to_jsonb(s)) k),'public projection contains no identity');
select public.resonate(:'star');
select public.resonate(:'star');
select proof.assert((select resonances=1 from public.tonights_sky() where id=:'star'),'resonance is idempotent');

set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.join_circle(:'invite');
select proof.assert((select count(*)=2 from public.circle_members),'invite joins the private circle');
select proof.assert((select consulted_on is not null from public.circle_members where user_id='00000000-0000-0000-0000-000000000001'),'member sees consultation day');
select proof.reject(format('select public.join_circle(%L)',:'invite'),'P0001');
select public.react_in_circle(:'circle','00000000-0000-0000-0000-000000000001');
select public.react_in_circle(:'circle','00000000-0000-0000-0000-000000000001');
select proof.assert((select count(*)=1 from public.circle_reactions),'one fixed reaction per member/day');
select proof.assert(public.open_forecast(:'seal')='Your next chapter will bring a new skill.','recipient opens headline only');
select proof.assert(public.open_forecast(:'seal')='Your next chapter will bring a new skill.','same recipient can reopen');
select proof.assert((select count(*)=0 from public.sealed_forecasts),'recipient cannot read token table');
select public.leave_circle(:'circle');
select proof.assert((select count(*)=0 from public.circle_members),'leaving immediately removes visibility');
select proof.reject(format('select public.react_in_circle(%L,%L)',:'circle','00000000-0000-0000-0000-000000000001'),'P0001');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
select proof.reject(format('select public.open_forecast(%L)',:'seal'),'P0001');

set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.invite_to_circle(:'circle') as expired_invite \gset
select proof.reject('select public.seal_forecast(''20000000-0000-0000-0000-000000000001'')','P0001');
reset role; update public.social_profiles set plus=true where user_id='00000000-0000-0000-0000-000000000001'; set role authenticated;
select public.seal_forecast('20000000-0000-0000-0000-000000000001') as expired_seal \gset
reset role;
update public.circle_invites set expires_at=now()-interval '1 second' where token=:'expired_invite';
update public.sealed_forecasts set expires_at=now()-interval '1 second' where token=:'expired_seal';
update public.sky_stars set day=(now() at time zone 'UTC')::date-1;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select proof.assert((select count(*)=0 from public.tonights_sky()),'yesterday is not tonight');
select proof.reject(format('select public.resonate(%L)',:'star'),'P0001');
select proof.reject(format('select public.join_circle(%L)',:'expired_invite'),'P0001');
select proof.reject(format('select public.open_forecast(%L)',:'expired_seal'),'P0001');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.revoke_forecast(id) from public.sealed_forecasts where token=:'seal';
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select proof.reject(format('select public.open_forecast(%L)',:'seal'),'P0001');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.leave_circle(:'circle');
select proof.assert((select count(*)=0 from public.circles),'creator closes own circle');

-- Consent is off by default, forced off for teen/unknown, and never client-spoofed.
select proof.assert((select friends_can_ask=false from public.social_profiles),'friend consent defaults off');
select proof.reject('update public.social_profiles set plus=true','42501');
select public.create_circle() as friends_circle \gset
select public.invite_to_circle(:'friends_circle') as friends_invite \gset
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.join_circle(:'friends_invite');
select public.circle_checkin('learning');
select proof.reject(format('select public.authorize_friend_reading(%L,%L,%L)','00000000-0000-0000-0000-000000000001',:'friends_circle','00000000-0000-0000-0000-000000000002'),'42501');
reset role; set role service_role;
select proof.reject(format('select public.authorize_friend_reading(%L,%L,%L)','00000000-0000-0000-0000-000000000001',:'friends_circle','00000000-0000-0000-0000-000000000002'),'P0001');
reset role; set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.set_friend_consent(true);
reset role; set role service_role;
select public.authorize_friend_reading('00000000-0000-0000-0000-000000000001',:'friends_circle','00000000-0000-0000-0000-000000000002') as friend_context \gset
select proof.assert(:'friend_context'::jsonb->>'sun_sign'='leo','friend context sign');
select proof.assert(:'friend_context'::jsonb->'themes'='["learning"]'::jsonb,'friend context only shared themes');
select proof.assert((select count(*)=3 from jsonb_object_keys(:'friend_context'::jsonb)),'friend context has no private facts');
reset role; set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select proof.assert((select count(*)=1 from public.friend_notices where not seen),'friend receives anonymous notice');
select public.set_friend_consent(false);
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
select proof.reject('select public.set_friend_consent(true)','P0001');
reset role;
select proof.reject('update public.social_profiles set friends_can_ask=true where age_band=''teen''','23514');
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.publish_star('10000000-0000-0000-0000-000000000001') as reported_star \gset
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select proof.reject('select public.publish_star(''10000000-0000-0000-0000-000000000001'')','P0001');
select public.report_star(:'reported_star');
select public.report_star(:'reported_star');
select proof.assert((select count(*)=1 from public.tonights_sky()),'repeat report from one user counts once');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
select public.report_star(:'reported_star');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.report_star(:'reported_star');
select proof.assert((select count(*)=0 from public.tonights_sky()),'three independent reports auto-hide');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.block_person(member=>'00000000-0000-0000-0000-000000000001');
select proof.assert((select count(*)=1 from public.circle_people()),'blocked member disappears');
reset role; set role service_role;
select proof.reject(format('select public.authorize_friend_reading(%L,%L,%L)','00000000-0000-0000-0000-000000000001',:'friends_circle','00000000-0000-0000-0000-000000000002'),'P0001');
reset role;
update public.social_profiles set plus=false where user_id='00000000-0000-0000-0000-000000000001';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select proof.reject('select public.seal_forecast(''20000000-0000-0000-0000-000000000001'')','P0001');
select public.withdraw_star(:'reported_star');
select public.publish_star('10000000-0000-0000-0000-000000000001');
select proof.assert((select count(*)=0 from public.tonights_sky()),'withdraw/republish cannot reset reports');
select public.create_circle() as full_circle \gset
select public.invite_to_circle(:'full_circle') as full_invite \gset
reset role;
insert into auth.users select md5('social-capacity-'||i)::uuid from generate_series(1,19) i;
insert into public.circle_members(circle_id,user_id) select :'full_circle',md5('social-capacity-'||i)::uuid from generate_series(1,19) i;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select proof.reject(format('select public.join_circle(%L)',:'full_invite'),'P0001');
\echo 'PASS: SQL privacy invariants'
