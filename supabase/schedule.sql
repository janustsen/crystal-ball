-- Run once on the approved hosted project after functions and Vault secrets are configured.
-- Vault names: crystal_ball_project_url and crystal_ball_scheduler_secret. Never paste values into this file.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('crystal-ball-open-sky','0 * * * *', $$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='crystal_ball_project_url')||'/functions/v1/open-sky',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='crystal_ball_scheduler_secret')),
  body:='{}'::jsonb,timeout_milliseconds:=120000);
$$);
select cron.schedule('crystal-ball-social-push','* * * * *', $$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='crystal_ball_project_url')||'/functions/v1/social-push',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='crystal_ball_scheduler_secret')),
  body:='{}'::jsonb,timeout_milliseconds:=120000);
$$);
