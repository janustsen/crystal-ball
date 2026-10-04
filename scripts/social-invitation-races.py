import os
import subprocess
import time
from pathlib import Path

PSQL = str(Path(os.environ['PG_BIN']) / 'psql')
OWNER, SUCCESSOR, RECIPIENT, CIRCLE = [f'83000000-0000-0000-0000-{n:012d}' for n in range(1, 5)]
ARGS = [PSQL, '-XAtq', '-v', 'ON_ERROR_STOP=1']


def sql(statement):
    return subprocess.check_output(ARGS + ['-c', statement], text=True).strip()


def auth(user):
    return f"set role authenticated; set request.jwt.claim.sub='{user}';"


def fixture(alone=False):
    sql(f"""
    delete from public.circles where id='{CIRCLE}';
    insert into auth.users values ('{OWNER}'),('{SUCCESSOR}'),('{RECIPIENT}') on conflict do nothing;
    insert into public.social_profiles(user_id,handle,age_band,plus) values
      ('{OWNER}','raceowner','adult',true),('{SUCCESSOR}','racesuccessor','adult',true),
      ('{RECIPIENT}','racerecipient','adult',true) on conflict do nothing;
    insert into public.circles(id,owner_id) values ('{CIRCLE}','{OWNER}');
    insert into public.circle_members(circle_id,user_id) values ('{CIRCLE}','{OWNER}');
    """)
    if not alone:
        sql(f"insert into public.circle_members(circle_id,user_id) values ('{CIRCLE}','{SUCCESSOR}')")


def issue(kind, user=OWNER):
    return auth(user) + (f"select public.invite_to_circle('{CIRCLE}');" if kind == 'link' else
                         f"select public.request_circle_invite('{CIRCLE}','racerecipient');")


def race(kind, departure, issuance_first):
    fixture(departure == 'alone')
    transition = auth(OWNER) + (f"select public.manage_circle('{CIRCLE}','{SUCCESSOR}','transfer');" if departure == 'transfer' else f"select public.leave_circle('{CIRCLE}');")
    first = subprocess.Popen(ARGS, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    second = None
    try:
        first.stdin.write('begin;\n' + (issue(kind) if issuance_first else transition) + '\n\\echo ready\n')
        first.stdin.flush()
        lines = []
        while True:
            line = first.stdout.readline().strip()
            if line == 'ready':
                break
            lines.append(line)
            assert first.poll() is None, first.stderr.read()
        second = subprocess.Popen(ARGS + ['-c', transition if issuance_first else issue(kind)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env={**os.environ, 'PGAPPNAME': 'invitation-race'})
        deadline = time.monotonic() + 5
        while sql("select count(*) from pg_stat_activity where application_name='invitation-race' and wait_event_type='Lock'") != '1':
            assert second.poll() is None, 'Operation bypassed the ownership lock'
            assert time.monotonic() < deadline, 'Operation never waited for ownership'
            time.sleep(0.02)
        first.stdin.write('commit;\n\\q\n')
        first.stdin.flush()
        first.wait(timeout=5)
        output, error = second.communicate(timeout=5)
        if issuance_first:
            assert second.returncode == 0, (output, error)
        else:
            assert second.returncode != 0 and 'can invite' in error, (output, error)
            assert sql(f"select count(*) from public.social_notifications where circle_id='{CIRCLE}' and kind='invite'") == '0'
        if issuance_first and kind == 'link':
            token = next(line for line in lines if len(line) == 36)
            join = subprocess.run(ARGS + ['-c', auth(RECIPIENT) + f"select public.join_circle('{token}');"], capture_output=True, text=True)
            assert join.returncode != 0 and 'expired or was used' in join.stderr
        assert sql(f"select count(*) from public.circle_invites where circle_id='{CIRCLE}'") == '0'
        assert sql(f"select count(*) from public.circle_requests where circle_id='{CIRCLE}' and status='pending'") == '0'
        assert sql(f"select count(*) from public.circle_members where circle_id='{CIRCLE}' and user_id='{RECIPIENT}'") == '0'
    finally:
        if first.poll() is None:
            first.stdin.write('rollback;\n\\q\n')
            first.stdin.flush()
            first.wait(timeout=5)
        if second is not None and second.poll() is None:
            second.terminate()
            second.wait(timeout=5)


for kind in ('link', 'handle'):
    for departure in ('transfer', 'leave', 'alone'):
        for issuance_first in (True, False):
            race(kind, departure, issuance_first)
    fixture()
    sql(auth(OWNER) + f"select public.manage_circle('{CIRCLE}','{SUCCESSOR}','transfer');")
    result = sql(issue(kind, SUCCESSOR))
    if kind == 'link':
        assert sql(auth(RECIPIENT) + f"select public.join_circle('{result}');") == CIRCLE
    else:
        request = sql(f"select id from public.circle_requests where circle_id='{CIRCLE}' and status='pending'")
        sql(auth(RECIPIENT) + f"select public.answer_circle_invite('{request}',true);")
    assert sql(f"select count(*) from public.circle_members where circle_id='{CIRCLE}' and user_id='{RECIPIENT}'") == '1'
print('PASS: link and handle issuance serialize with transfer, departure and deletion in both orders; new owners can invite')
