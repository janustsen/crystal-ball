create table public.knowledge (
 user_id uuid primary key references auth.users(id) on delete cascade,
 facts jsonb not null default '{}'::jsonb check (jsonb_typeof(facts) = 'object'),
 updated_at timestamptz not null default now()
);
create table public.predictions (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload) = 'object'),
 created_at timestamptz not null default now()
);
alter table public.knowledge enable row level security;
alter table public.predictions enable row level security;
create policy own_knowledge on public.knowledge for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_predictions on public.predictions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.knowledge, public.predictions to authenticated;
