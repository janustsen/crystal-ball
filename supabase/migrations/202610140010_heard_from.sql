-- "Where did you hear about us?": a count per UTC day and answer. No account, device or network is stored.
-- Only the engine's service role counts; clients have no access.
create table public.heard_from(
 day date not null,
 source text not null check(source in ('TikTok','Instagram','A friend','App Store','Somewhere else')),
 answers integer not null default 0 check(answers>=0),
 primary key(day,source)
);
alter table public.heard_from enable row level security;
revoke all on public.heard_from from public,anon,authenticated;

create function public.count_heard_from(heard text) returns void
 language sql volatile security definer set search_path='' as $$
 insert into public.heard_from(day,source,answers) values((now() at time zone 'UTC')::date,heard,1)
 on conflict(day,source) do update set answers=public.heard_from.answers+1;
$$;
revoke all on function public.count_heard_from(text) from public,anon,authenticated;
grant execute on function public.count_heard_from(text) to service_role;
