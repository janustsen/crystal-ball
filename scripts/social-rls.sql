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
grant usage on schema proof to authenticated,anon;
grant execute on all functions in schema proof to authenticated,anon;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
set role anon;
select proof.reject('select * from public.tonights_sky()','42501');
select proof.reject('select * from public.circle_members','42501');
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.publish_star('learning') as star \gset
select public.create_circle() as circle \gset
select public.invite_to_circle(:'circle') as invite \gset
select public.seal_forecast('Your next chapter will bring a new skill.') as seal \gset
select proof.reject('select public.publish_star(''My name is private'')','23514');
select proof.reject('insert into public.sky_stars(user_id,prompt) values(auth.uid(),''work'')','42501');
select proof.assert((select count(*)=1 from public.sky_stars),'one private star');
select public.publish_star('work');
select proof.assert((select count(*)=1 from public.sky_stars),'daily publication is idempotent');
select proof.assert((select consulted_on is null from public.circle_members),'no historical check-in backfill');
select public.circle_checkin();
select proof.reject(format('select public.open_forecast(%L)',:'seal'),'P0001');

set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
select proof.assert((select count(*)=0 from public.sky_stars),'outsider cannot see sky owners');
select proof.assert((select count(*)=0 from public.circles),'outsider cannot enumerate circles');
select proof.assert((select count(*)=0 from public.circle_members),'outsider cannot enumerate members');
select proof.assert((select count(*)=0 from public.sealed_forecasts),'outsider cannot read sealed payloads');
select proof.reject('select * from public.circle_invites','42501');
select proof.reject(format('select public.invite_to_circle(%L)',:'circle'),'P0001');
select proof.reject(format('select public.react_in_circle(%L,%L)',:'circle','00000000-0000-0000-0000-000000000001'),'P0001');
select proof.assert((select array_agg(k order by k)=array['id','mine','prompt','resonances','resonated'] from public.tonights_sky() s, lateral jsonb_object_keys(to_jsonb(s)) k),'public projection contains no identity');
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
select public.seal_forecast('A hopeful new beginning.') as expired_seal \gset
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
delete from public.sealed_forecasts where token=:'seal';
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select proof.reject(format('select public.open_forecast(%L)',:'seal'),'P0001');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.leave_circle(:'circle');
select proof.assert((select count(*)=0 from public.circles),'creator closes own circle');
\echo 'PASS: SQL privacy invariants'
