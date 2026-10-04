#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
pg_bin="${PG_BIN:-/opt/homebrew/opt/postgresql@17/bin}"
if [[ ! -x "$pg_bin/initdb" ]]; then
  echo 'Set PG_BIN to a PostgreSQL 17 bin directory.' >&2
  exit 1
fi
mkdir -p .local
cluster=$(mktemp -d "$PWD/.local/social-pg.XXXXXX")
cleanup() {
  "$pg_bin/pg_ctl" -D "$cluster/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$cluster"
}
trap cleanup EXIT
"$pg_bin/initdb" -D "$cluster/data" -A trust --no-locale -E UTF8 >"$cluster/init.log"
# Disposable loopback cluster; short socket paths are unavailable in long worktree paths.
"$pg_bin/pg_ctl" -D "$cluster/data" -l "$cluster/server.log" -o "-p ${SOCIAL_PG_PORT:-55439} -c unix_socket_directories='' -c listen_addresses='127.0.0.1'" -w start >/dev/null
export PGHOST=127.0.0.1 PGPORT="${SOCIAL_PG_PORT:-55439}" PGDATABASE=postgres
sql=("$pg_bin/psql" -X -v ON_ERROR_STOP=1)
"${sql[@]}" <<'SQL' >/dev/null
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
-- Match Supabase's permissive default grants; migrations must revoke them.
alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
SQL
for migration in supabase/migrations/*.sql; do
  "${sql[@]}" -f "$migration" >"$cluster/migration.log"
done
if [[ "${SOCIAL_MOMENTS_ONLY:-0}" == 1 ]]; then
  PG_BIN="$pg_bin" python3 scripts/social-moment-races.py
  exit
fi
if [[ "${SOCIAL_CHARGE_ADAPTER_ONLY:-0}" == 1 ]]; then
  PG_BIN="$pg_bin" node scripts/check-social-charge-adapter.mjs
  exit
fi
if [[ "${SOCIAL_MEMBERSHIP_ONLY:-0}" == 1 ]]; then
  PG_BIN="$pg_bin" python3 scripts/social-membership-races.py
  exit
fi
"${sql[@]}" -f scripts/social-rls.sql
"${sql[@]}" -f scripts/school-rls.sql
"${sql[@]}" -f scripts/social-v2-rls.sql

# Two distinct recipients race to open a fresh seal. Exactly one may succeed.
token=$("${sql[@]}" -Atc "delete from public.social_blocks; update public.social_profiles set plus=true where user_id='00000000-0000-0000-0000-000000000001'; set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001'; select public.seal_forecast('20000000-0000-0000-0000-000000000001');" | tail -1)
claim() {
  "${sql[@]}" -Atc "set role authenticated; set request.jwt.claim.sub='$1'; select public.open_forecast('$token');" >"$2" 2>&1
}
claim 00000000-0000-0000-0000-000000000002 "$cluster/claim-a" & first=$!
claim 00000000-0000-0000-0000-000000000003 "$cluster/claim-b" & second=$!
passed=0
if wait "$first"; then passed=$((passed+1)); fi
if wait "$second"; then passed=$((passed+1)); fi
[[ "$passed" == 1 ]] || { cat "$cluster/claim-a" "$cluster/claim-b"; exit 1; }
# Two members publish different moderated group receipts concurrently: one open forecast wins.
"${sql[@]}" <<'SQL' >/dev/null
insert into public.circles(id,owner_id) values ('70000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001');
insert into public.circle_members(circle_id,user_id) values
 ('70000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001'),
 ('70000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
insert into public.circle_forecast_drafts(id,user_id,circle_id,question,headline,due_date) values
 ('70000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','Will we learn together?','A creative skill may bring you together.',current_date+1),
 ('70000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000001','Will we explore together?','A creative outing may bring you together.',current_date+1);
SQL
publish_group() {
 "${sql[@]}" -Atc "set role authenticated; set request.jwt.claim.sub='$1'; select public.publish_circle_forecast('$2');" >"$3" 2>&1
}
publish_group 00000000-0000-0000-0000-000000000001 70000000-0000-0000-0000-000000000002 "$cluster/group-a" & first=$!
publish_group 00000000-0000-0000-0000-000000000002 70000000-0000-0000-0000-000000000003 "$cluster/group-b" & second=$!
passed=0
if wait "$first"; then passed=$((passed+1)); fi
if wait "$second"; then passed=$((passed+1)); fi
[[ "$passed" == 1 ]] || { cat "$cluster/group-a" "$cluster/group-b"; exit 1; }
echo 'PASS: concurrent Circle publication permits exactly one open forecast'
echo 'PASS: real PostgreSQL RLS, anonymous projection, invite expiry/replay, leave, sealed privacy, and concurrent single-recipient claim'
echo 'Boundary: auth.uid() and roles are stubbed; this does not verify Supabase Auth/PostgREST transport.'
if [[ "${SOCIAL_DB_SERVE:-0}" == 1 ]]; then
  export PG_BIN="$pg_bin"
  node scripts/social-dev-transport.mjs
fi
