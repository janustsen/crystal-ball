import os
import subprocess
import time
from pathlib import Path

PSQL = str(Path(os.environ['PG_BIN']) / 'psql')
OWNER, CIRCLE, READING = [f'82000000-0000-0000-0000-{n:012d}' for n in range(1, 4)]


def sql(statement):
    return subprocess.check_output([PSQL, '-XAtq', '-v', 'ON_ERROR_STOP=1', '-c', statement], text=True).strip()


def share(moment):
    return f"set role authenticated; set request.jwt.claim.sub='{OWNER}'; select public.share_circle_moment('{READING}','{moment}');"


sql(f"""
insert into auth.users values ('{OWNER}');
insert into public.social_profiles(user_id) values ('{OWNER}');
insert into public.circles(id,owner_id) values ('{CIRCLE}','{OWNER}');
insert into public.circle_members(circle_id,user_id) values ('{CIRCLE}','{OWNER}');
""")
sql(share('golden'))
first = subprocess.Popen([PSQL, '-XAtq', '-v', 'ON_ERROR_STOP=1'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
second = None
try:
    first.stdin.write('begin;\n' + share('yes') + '\n\\echo ready\n')
    first.stdin.flush()
    while first.stdout.readline().strip() != 'ready':
        assert first.poll() is None, first.stderr.read()
    second = subprocess.Popen([PSQL, '-XAtq', '-v', 'ON_ERROR_STOP=1', '-c', share('pending')], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env={**os.environ, 'PGAPPNAME': 'moment-race'})
    deadline = time.monotonic() + 5
    while sql("select count(*) from pg_stat_activity where application_name='moment-race' and wait_event_type='Lock'") != '1':
        assert second.poll() is None, 'Replacement did not wait for the previous outcome'
        assert time.monotonic() < deadline, 'Replacement never acquired the account lock'
        time.sleep(0.02)
    first.stdin.write('commit;\n\\q\n')
    first.stdin.flush()
    first.wait(timeout=5)
    output, error = second.communicate(timeout=5)
    assert second.returncode == 0, (output, error)
    assert sql(f"select string_agg(kind,',' order by kind) from public.circle_moments where reading_id='{READING}'") == 'golden,pending'
    sql(share('no'))
    assert sql(f"select string_agg(kind,',' order by kind) from public.circle_moments where reading_id='{READING}'") == 'golden,no'
    print('PASS: concurrent outcome replacement preserves one answer and the golden moment')
finally:
    if first.poll() is None:
        first.stdin.write('rollback;\n\\q\n')
        first.stdin.flush()
        first.wait(timeout=5)
    if second is not None and second.poll() is None:
        second.terminate()
        second.wait(timeout=5)
