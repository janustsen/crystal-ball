-- One chart weather per Plus user per calendar month. The engine claims the month before inference,
-- so repeat or concurrent requests reuse the stored text instead of generating again. Service role only.
-- Re-runnable: this file once shared version 202610060070 with golden, so some databases already applied it.
create table if not exists public.chart_weather(
 user_id uuid not null references auth.users on delete cascade,
 month text not null check(month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
 text text check(text is null or length(text) between 1 and 400),
 -- The Sun/Moon/rising the reading was written for; a changed chart waits for next month.
 chart text check(chart is null or length(chart) between 1 and 40),
 claimed_at timestamptz not null default now(),
 primary key(user_id,month)
);
alter table public.chart_weather enable row level security;
revoke all on public.chart_weather from public,anon,authenticated;

-- Returns {text,chart} when the month is already read, {claimed:true} when the caller should generate,
-- or {claimed:false} while another request holds a fresh claim. A claim older than two minutes was abandoned.
create or replace function public.claim_chart_weather(viewer uuid,target_month text) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
 declare fresh boolean;claim public.chart_weather;
 begin
 if not exists(select 1 from public.social_profiles where user_id=viewer and plus_until>now()) then raise exception 'Chart weather is a Plus extra'; end if;
 insert into public.chart_weather(user_id,month) values(viewer,target_month) on conflict do nothing returning true into fresh;
 if fresh then return jsonb_build_object('claimed',true); end if;
 select * into claim from public.chart_weather where user_id=viewer and month=target_month for update;
 if claim.text is not null then return jsonb_build_object('text',claim.text,'chart',claim.chart); end if;
 if claim.claimed_at<now()-interval '2 minutes' then
  update public.chart_weather set claimed_at=now() where user_id=viewer and month=target_month;
  return jsonb_build_object('claimed',true);
 end if;
 return jsonb_build_object('claimed',false);
 end $$;

-- Completes a claim; an already-read month keeps its first text.
create or replace function public.save_chart_weather(viewer uuid,target_month text,weather text,weather_chart text) returns text
 language sql volatile security definer set search_path='' as $$
 update public.chart_weather set text=coalesce(text,weather),chart=coalesce(chart,weather_chart) where user_id=viewer and month=target_month returning text;
 $$;

-- A failed generation gives the month back.
create or replace function public.release_chart_weather(viewer uuid,target_month text) returns void
 language sql volatile security definer set search_path='' as $$
 delete from public.chart_weather where user_id=viewer and month=target_month and text is null;
 $$;

revoke all on function public.claim_chart_weather(uuid,text),public.save_chart_weather(uuid,text,text,text),public.release_chart_weather(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_chart_weather(uuid,text),public.save_chart_weather(uuid,text,text,text),public.release_chart_weather(uuid,text) to service_role;
