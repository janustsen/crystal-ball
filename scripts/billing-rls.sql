\set QUIET 1
-- Runs after social-rls.sql (proof schema, fixture users). Rolled back; leaves fixtures untouched.
begin;
delete from public.reading_charges;
update public.social_profiles set plus=false,plus_until=null,packs=0;
-- Clients can read only their own balance and can never grant or charge.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select proof.reject($q$select public.apply_store_entitlements('00000000-0000-0000-0000-000000000001',now()+interval '1 week','[]')$q$,'42501');
select proof.reject($q$select public.charge_reading('00000000-0000-0000-0000-000000000001','r')$q$,'42501');
select proof.reject($q$select public.reading_balance('00000000-0000-0000-0000-000000000001')$q$,'42501');
select proof.reject($q$update public.social_profiles set packs=99$q$,'42501');
select proof.reject($q$select * from public.reading_charges$q$,'42501');
select proof.reject($q$select * from public.pack_purchases$q$,'42501');
select proof.reject($q$select public.mark_circle_charged('00000000-0000-0000-0000-000000000001')$q$,'42883');
select proof.assert((select count(*)=1 from public.social_profiles where packs=0),'own profile row is readable, others are not');
reset role;

set role service_role;
-- Free: one daily reading, then refusal; retries of the same reading never double charge.
select proof.assert((public.charge_reading('00000000-0000-0000-0000-000000000001','free-1')->>'used')::int=1,'first free reading charged');
select proof.assert((public.charge_reading('00000000-0000-0000-0000-000000000001','free-1')->>'used')::int=1,'same reading id is idempotent');
select proof.reject($q$select public.charge_reading('00000000-0000-0000-0000-000000000001','free-2')$q$,'P0001');
-- A pack transaction credits exactly once, even when reconciled twice.
select proof.assert((public.apply_store_entitlements('00000000-0000-0000-0000-000000000001',null,'[{"id":"txn-5","readings":5}]')->>'packs')::int=5,'pack credited');
select proof.assert((public.apply_store_entitlements('00000000-0000-0000-0000-000000000001',null,'[{"id":"txn-5","readings":5}]')->>'packs')::int=5,'replayed pack transaction is not credited twice');
select proof.assert((public.apply_store_entitlements('00000000-0000-0000-0000-000000000002',null,'[{"id":"txn-5","readings":5}]')->>'packs')::int=0,'a transaction credits only its first owner');
select proof.assert((public.charge_reading('00000000-0000-0000-0000-000000000001','pack-1')->>'packs')::int=4,'reading beyond the daily allowance spends a pack');
-- Plus: ten daily readings while entitled; expiry ends it and the social flag follows.
select proof.assert((public.apply_store_entitlements('00000000-0000-0000-0000-000000000001',now()+interval '7 days','[]')->>'plus')::boolean,'active subscription grants Plus');
select proof.assert((select plus from public.social_profiles where user_id='00000000-0000-0000-0000-000000000001'),'social Plus mirrors the subscription');
select public.charge_reading('00000000-0000-0000-0000-000000000001','plus-'||i) from generate_series(3,10) i;
select proof.assert((public.reading_balance('00000000-0000-0000-0000-000000000001')->>'used')::int=10 and (public.reading_balance('00000000-0000-0000-0000-000000000001')->>'packs')::int=4,'Plus readings use the daily allowance before packs');
select proof.assert((public.charge_reading('00000000-0000-0000-0000-000000000001','plus-11')->>'packs')::int=3,'eleventh Plus reading spends a pack');
select proof.assert(not (public.apply_store_entitlements('00000000-0000-0000-0000-000000000001',now()-interval '1 second','[]')->>'plus')::boolean,'expired subscription removes Plus');
select proof.assert(not (select plus from public.social_profiles where user_id='00000000-0000-0000-0000-000000000001'),'social Plus follows expiry');
reset role;

-- A Circle forecast is charged server-side at publication, once, and fails closed without readings.
insert into public.circles(id,owner_id) values('80000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
insert into public.circle_members(circle_id,user_id) values('80000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
insert into public.circle_forecast_drafts(id,user_id,circle_id,question,headline,due_date) values
 ('80000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','80000000-0000-0000-0000-000000000001','Will we learn together?','A creative skill may bring you together.',current_date+1),
 ('80000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','80000000-0000-0000-0000-000000000001','Will we explore together?','A creative outing may bring you together.',current_date+1);
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select proof.assert((select charged_at is not null from public.publish_circle_forecast('80000000-0000-0000-0000-000000000002')),'publication records its charge');
select proof.assert((select charged_at is not null from public.publish_circle_forecast('80000000-0000-0000-0000-000000000002')),'republishing returns the same receipt');
reset role;
select proof.assert((select count(*)=1 from public.reading_charges where user_id='00000000-0000-0000-0000-000000000002'),'Circle publication charged exactly one reading');
delete from public.circle_forecasts where id='80000000-0000-0000-0000-000000000002';
set role authenticated;
select proof.reject($q$select public.publish_circle_forecast('80000000-0000-0000-0000-000000000003')$q$,'P0001');
reset role;
select proof.assert((select count(*)=0 from public.circle_forecasts where id='80000000-0000-0000-0000-000000000003'),'no reading left means no publication');
rollback;
\echo 'PASS: server-owned reading ledger, store reconciliation and Circle publication charges'
