-- Real cascade proof, in the disposable verification database only.
begin;
insert into auth.users values('de1e7e00-0000-0000-0000-000000000001'),('de1e7e00-0000-0000-0000-000000000002');
insert into public.social_profiles(user_id) values('de1e7e00-0000-0000-0000-000000000001'),('de1e7e00-0000-0000-0000-000000000002');
insert into public.knowledge(user_id,facts) values('de1e7e00-0000-0000-0000-000000000001','{"context":"private"}'),('de1e7e00-0000-0000-0000-000000000002','{}');
insert into public.predictions(id,user_id,payload) values(gen_random_uuid(),'de1e7e00-0000-0000-0000-000000000001','{}');
insert into public.social_drafts(id,user_id,kind,wording,theme) values('de1e7e00-0000-0000-0000-000000000003','de1e7e00-0000-0000-0000-000000000001','star','Will a creative spark find me?','growth');
insert into public.sky_stars(id,user_id,draft_id,theme,wording) values('de1e7e00-0000-0000-0000-000000000004','de1e7e00-0000-0000-0000-000000000001','de1e7e00-0000-0000-0000-000000000003','growth','Will a creative spark find me?');
insert into public.star_reports values('de1e7e00-0000-0000-0000-000000000004','de1e7e00-0000-0000-0000-000000000002');
insert into public.circles(id,owner_id) values('de1e7e00-0000-0000-0000-000000000005','de1e7e00-0000-0000-0000-000000000001');
insert into public.circle_members(circle_id,user_id) values('de1e7e00-0000-0000-0000-000000000005','de1e7e00-0000-0000-0000-000000000001'),('de1e7e00-0000-0000-0000-000000000005','de1e7e00-0000-0000-0000-000000000002');
insert into public.social_push_tokens(user_id,token) values('de1e7e00-0000-0000-0000-000000000001',repeat('f',64));
insert into public.ai_daily_requests(user_id,day,category,requests) values('de1e7e00-0000-0000-0000-000000000001',current_date,'omen',1);
-- The native token constraint is enforced even for trusted direct writes.
select proof.reject($q$insert into public.social_push_tokens(user_id,token) values('de1e7e00-0000-0000-0000-000000000002','ExpoPushToken[obsolete]')$q$,'23514');
delete from auth.users where id='de1e7e00-0000-0000-0000-000000000001';
select proof.assert(not exists(select 1 from public.knowledge where user_id='de1e7e00-0000-0000-0000-000000000001'),'account deletion removes remembered facts');
select proof.assert(not exists(select 1 from public.predictions where user_id='de1e7e00-0000-0000-0000-000000000001'),'account deletion removes readings');
select proof.assert(not exists(select 1 from public.social_profiles where user_id='de1e7e00-0000-0000-0000-000000000001'),'account deletion removes profile');
select proof.assert(not exists(select 1 from public.social_drafts where id='de1e7e00-0000-0000-0000-000000000003'),'account deletion removes drafts');
select proof.assert(not exists(select 1 from public.sky_stars where id='de1e7e00-0000-0000-0000-000000000004'),'account deletion removes Stars');
select proof.assert(not exists(select 1 from public.star_reports where star_id='de1e7e00-0000-0000-0000-000000000004'),'account deletion removes reports on deleted Stars');
select proof.assert(not exists(select 1 from public.circle_members where circle_id='de1e7e00-0000-0000-0000-000000000005'),'owned Circles and memberships cascade');
select proof.assert(not exists(select 1 from public.social_push_tokens where user_id='de1e7e00-0000-0000-0000-000000000001'),'account deletion removes push token');
select proof.assert(not exists(select 1 from public.ai_daily_requests where user_id='de1e7e00-0000-0000-0000-000000000001'),'account deletion removes linked usage');
select proof.assert(exists(select 1 from public.knowledge where user_id='de1e7e00-0000-0000-0000-000000000002'),'account deletion preserves unrelated data');
rollback;
