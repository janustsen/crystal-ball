#!/usr/bin/env python3
"""Drive the actual hosted migration on disposable Postgres, including concurrent callers."""
import concurrent.futures
import os
from pathlib import Path
import subprocess
import tempfile
import uuid

root = Path(__file__).resolve().parents[1]
pg = Path(os.environ.get('PG_BIN', '/opt/homebrew/opt/postgresql@17/bin'))
port = os.environ.get('HOSTED_PG_PORT', '55478')
user = '10000000-0000-4000-8000-000000000001'
with tempfile.TemporaryDirectory(prefix='hosted-limits-', dir=os.environ.get('TMPDIR')) as folder:
    tmp = Path(folder)
    env = {**os.environ, 'PGHOST': '127.0.0.1', 'PGPORT': port, 'PGDATABASE': 'postgres'}
    password = tmp / 'password'
    password.write_text(uuid.uuid4().hex)
    password.chmod(0o600)
    pgpass = tmp / 'pgpass'
    pgpass.write_text(f'127.0.0.1:{port}:*:*:{password.read_text()}\n')
    pgpass.chmod(0o600)
    env['PGPASSFILE'] = str(pgpass)

    def run(*args):
        return subprocess.run([str(pg / args[0]), *args[1:]], env=env, text=True, capture_output=True, check=True)

    def sql(text, ok=True):
        result = subprocess.run([str(pg / 'psql'), '-XAt', '-v', 'ON_ERROR_STOP=1', '-c', text], env=env, text=True, capture_output=True)
        if ok and result.returncode:
            raise AssertionError(result.stderr)
        if not ok:
            assert result.returncode, f'Should have been refused: {text}'
        return result.stdout.strip()

    run('initdb', '-D', str(tmp / 'data'), '-A', 'scram-sha-256', f'--pwfile={password}', '--no-locale', '-E', 'UTF8')
    started = False
    try:
        run('pg_ctl', '-D', str(tmp / 'data'), '-l', str(tmp / 'postgres.log'), '-o', f"-p {port} -c unix_socket_directories='' -c listen_addresses=127.0.0.1 -c timezone=UTC", '-w', 'start')
        started = True
        sql("""
        create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
        create schema auth; create table auth.users(id uuid primary key);
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
        grant usage on schema auth to anon,authenticated,service_role;
        grant execute on function auth.uid() to anon,authenticated,service_role;
        alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
        alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
        """)
        for migration in sorted((root / 'supabase/migrations').glob('*.sql')):
            run('psql', '-X', '-v', 'ON_ERROR_STOP=1', '-f', str(migration))
        sql(f"insert into auth.users values('{user}');")

        def admit(action, ok=True):
            return sql(f"set role service_role; select public.admit_ai_request('{user}','{action}');", ok)

        # Starter: 20 questions, with one retry each. Failed attempts also consume abuse quota.
        for _ in range(40):
            admit('predict')
        admit('bond', False)
        sql('truncate public.ai_daily_requests;')
        # Existing, exhausted-starter free account: 1 daily question, 1 retry; plans get six attempts.
        sql(f"insert into public.reading_charges(user_id,reading_id,day,source) select '{user}', 'old:'||n, current_date-1,'starter' from generate_series(1,20) n;")
        admit('predict'); admit('social:friend'); admit('predict', False)
        for _ in range(6):
            admit('plan')
        admit('plan', False)
        # Changing the client date or creating a fresh server cannot reset UTC quotas.
        admit('omen'); admit('omen'); admit('omen', False)
        sql('truncate public.ai_daily_requests;')
        sql(f"update public.social_profiles set plus_until=now()+interval '1 day' where user_id='{user}';")
        for _ in range(20):
            admit('predict')
        admit('bond', False)
        sql(f"update public.social_profiles set plus_until=null,packs=5 where user_id='{user}'; truncate public.ai_daily_requests;")
        for _ in range(12):
            admit('predict')
        admit('predict', False)
        sql(f"update public.social_profiles set packs=0 where user_id='{user}'; truncate public.ai_daily_requests;")

        def quota_race(_):
            result = subprocess.run([str(pg / 'psql'), '-XAt', '-v', 'ON_ERROR_STOP=1', '-c', f"set role service_role; select public.admit_ai_request('{user}','predict');"], env=env, text=True, capture_output=True)
            assert result.returncode == 0 or 'AI daily quota reached' in result.stderr, result.stderr
            return result.returncode == 0

        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
            assert sum(pool.map(quota_race, range(20))) == 2
        print('PASS daily quotas: starter 20, free 1, Plus 10, packs, retry allowance, planning, omen')

        # An authenticated client cannot call the trusted RPCs or alter/read the money ledger.
        for role in ['anon', 'authenticated']:
            sql(f"set role {role}; select public.admit_ai_request('{user}','predict');", False)
            sql(f"set role {role}; select public.reserve_ai_spend('{uuid.uuid4()}',1);", False)
            sql(f"set role {role}; select public.settle_ai_spend('{uuid.uuid4()}',0);", False)
            sql(f"set role {role}; select * from public.ai_monthly_spend;", False)
        print('PASS service-only RPCs and ledger permissions')

        def reserve(amount, ok=True):
            key = str(uuid.uuid4())
            sql(f"set role service_role; select public.reserve_ai_spend('{key}',{amount});", ok)
            return key

        first = reserve(39591600)
        sql(f"set role service_role; select public.settle_ai_spend('{first}',100); select public.settle_ai_spend('{first}',100);")
        assert sql('select reserved||\'/\'||actual from public.ai_monthly_spend;') == '0/100'
        unknown = reserve(39591600)
        assert sql('select reserved from public.ai_monthly_spend;') == '39591600'
        sql(f"set role service_role; select public.settle_ai_spend('{unknown}',39591601);", False)
        # Only 100 nanodollars remain: twenty simultaneous 30-unit reservations admit exactly three.
        sql('update public.ai_monthly_spend set actual=25000000000-reserved-100;')

        def race(_):
            key = str(uuid.uuid4())
            result = subprocess.run([str(pg / 'psql'), '-XAt', '-v', 'ON_ERROR_STOP=1', '-c', f"set role service_role; select public.reserve_ai_spend('{key}',30);"], env=env, text=True, capture_output=True)
            assert result.returncode == 0 or 'AI monthly budget reached' in result.stderr, result.stderr
            return result.returncode == 0

        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
            assert sum(pool.map(race, range(20))) == 3
        assert sql('select reserved+actual from public.ai_monthly_spend;') == '24999999990'
        reserve(11, False)
        reserve(10)
        reserve(1, False)
        assert sql('select reserved+actual from public.ai_monthly_spend;') == '25000000000'
        print('PASS atomic $25 cap: concurrent admission, exact ceiling, failures retained, idempotent settlement')
        # Yesterday's quota does not count today; a prior month's fully spent row is never reset or reused.
        sql('update public.ai_daily_requests set day=current_date-1;')
        admit('omen')
        print('PASS UTC day rollover; cap remains durable across callers/connections')
        sql("delete from public.ai_spend_reservations; delete from public.ai_monthly_spend; insert into public.ai_monthly_spend(month,actual) values((date_trunc('month',now() at time zone 'UTC')-interval '1 month')::date,25000000000);")
        reserve(39591600)
        assert sql('select count(*) from public.ai_monthly_spend;') == '2'
        assert sql('select sum(actual) from public.ai_monthly_spend;') == '25000000000'
        print('PASS UTC month rollover opens a new ledger and preserves previous spend')
    finally:
        if started:
            run('pg_ctl', '-D', str(tmp / 'data'), '-m', 'immediate', 'stop')
