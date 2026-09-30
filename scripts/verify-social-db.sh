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
# Unix socket only: no shared instance, ports, credentials or containers.
"$pg_bin/pg_ctl" -D "$cluster/data" -l "$cluster/server.log" -o "-k $cluster -p 55439 -c listen_addresses=''" -w start >/dev/null
export PGHOST="$cluster" PGPORT=55439 PGDATABASE=postgres
sql=("$pg_bin/psql" -X -v ON_ERROR_STOP=1)
"${sql[@]}" <<'SQL' >/dev/null
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
-- Match Supabase's permissive default grants; migrations must revoke them.
alter default privileges in schema public grant all on tables to anon,authenticated;
alter default privileges in schema public grant execute on functions to anon,authenticated;
SQL
for migration in supabase/migrations/*.sql; do
  "${sql[@]}" -f "$migration" >"$cluster/migration.log"
done
"${sql[@]}" -f scripts/social-rls.sql

# Two distinct recipients race to open a fresh seal. Exactly one may succeed.
token=$("${sql[@]}" -Atc "set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001'; select public.seal_forecast('A new chapter awaits.');" | tail -1)
claim() {
  "${sql[@]}" -Atc "set role authenticated; set request.jwt.claim.sub='$1'; select public.open_forecast('$token');" >"$2" 2>&1
}
claim 00000000-0000-0000-0000-000000000002 "$cluster/claim-a" & first=$!
claim 00000000-0000-0000-0000-000000000003 "$cluster/claim-b" & second=$!
passed=0
if wait "$first"; then passed=$((passed+1)); fi
if wait "$second"; then passed=$((passed+1)); fi
[[ "$passed" == 1 ]] || { cat "$cluster/claim-a" "$cluster/claim-b"; exit 1; }
echo 'PASS: real PostgreSQL RLS, anonymous projection, invite expiry/replay, leave, sealed privacy, and concurrent single-recipient claim'
echo 'Boundary: auth.uid() and roles are stubbed; this does not verify Supabase Auth/PostgREST transport.'
