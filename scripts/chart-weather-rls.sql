\set QUIET 1
-- Runs after social-rls.sql (proof schema, fixture users). Rolled back; leaves fixtures untouched.
begin;
delete from public.chart_weather;
update public.social_profiles set plus_until=null;
update public.social_profiles set plus_until=now()+interval '1 week' where user_id='00000000-0000-0000-0000-000000000001';
-- Clients can neither read nor claim chart weather.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select proof.reject($q$select public.claim_chart_weather('00000000-0000-0000-0000-000000000001','2026-10')$q$,'42501');
select proof.reject($q$select public.save_chart_weather('00000000-0000-0000-0000-000000000001','2026-10','x','gemini/pisces/virgo')$q$,'42501');
select proof.reject($q$select * from public.chart_weather$q$,'42501');
reset role;

set role service_role;
-- Plus only; one reading per user and month, reused by repeat requests.
select proof.reject($q$select public.claim_chart_weather('00000000-0000-0000-0000-000000000002','2026-10')$q$,'P0001');
select proof.assert((public.claim_chart_weather('00000000-0000-0000-0000-000000000001','2026-10')->>'claimed')::boolean,'first request claims the month');
select proof.assert(not (public.claim_chart_weather('00000000-0000-0000-0000-000000000001','2026-10')->>'claimed')::boolean,'a concurrent request does not generate again');
select proof.assert(public.save_chart_weather('00000000-0000-0000-0000-000000000001','2026-10','Steady skies.','gemini/pisces/virgo')='Steady skies.','claim completes');
select proof.assert(public.claim_chart_weather('00000000-0000-0000-0000-000000000001','2026-10')=jsonb_build_object('text','Steady skies.','chart','gemini/pisces/virgo'),'repeat request reuses the stored reading and its chart');
select proof.assert(public.save_chart_weather('00000000-0000-0000-0000-000000000001','2026-10','Other skies.','gemini/leo/leo')='Steady skies.','the first reading wins');
-- A failed or abandoned claim gives the month back; a new month starts fresh.
select proof.assert((public.claim_chart_weather('00000000-0000-0000-0000-000000000001','2026-11')->>'claimed')::boolean,'next month is a new reading');
select public.release_chart_weather('00000000-0000-0000-0000-000000000001','2026-11');
select proof.assert((public.claim_chart_weather('00000000-0000-0000-0000-000000000001','2026-11')->>'claimed')::boolean,'a released claim can be retried');
update public.chart_weather set claimed_at=now()-interval '3 minutes' where month='2026-11';
select proof.assert((public.claim_chart_weather('00000000-0000-0000-0000-000000000001','2026-11')->>'claimed')::boolean,'an abandoned claim is retaken');
select proof.reject($q$select public.claim_chart_weather('00000000-0000-0000-0000-000000000001','2026-13')$q$,'23514');
-- Plus lapsing stops new reads.
update public.social_profiles set plus_until=now()-interval '1 second' where user_id='00000000-0000-0000-0000-000000000001';
select proof.reject($q$select public.claim_chart_weather('00000000-0000-0000-0000-000000000001','2026-12')$q$,'P0001');
reset role;
rollback;
\echo 'PASS: chart weather is Plus-only, one reading per user and month, service-role only'
