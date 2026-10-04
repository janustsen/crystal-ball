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
    insert into public.social_profiles(user_id,handle,age_band,plus_until) values
      ('{OWNER}','raceowner','adult','infinity'),('{SUCCESSOR}','racesuccessor','adult','infinity'),
      ('{RECIPIENT}','racerecipient','adult','infinity') on conflict do nothing;
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


def acceptance_race(kind, transition_kind, acceptance_first, profile_wait=False):
    fixture(transition_kind == 'alone')
    issued = sql(issue(kind))
    invitation = issued if kind == 'link' else sql(f"select id from public.circle_requests where circle_id='{CIRCLE}' and status='pending'")
    accept = auth(RECIPIENT) + (f"select public.join_circle('{invitation}');" if kind == 'link' else f"select public.answer_circle_invite('{invitation}',true);")
    transition = auth(OWNER) + (f"select public.manage_circle('{CIRCLE}','{SUCCESSOR}','transfer');" if transition_kind == 'transfer' else f"select public.leave_circle('{CIRCLE}');")
    if transition_kind == 'replace':
        sql(f"update public.circle_requests set expires_at=now()-interval '1 second' where id='{invitation}'")
        transition = issue('handle')
    first = subprocess.Popen(ARGS, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    second = None
    try:
        barrier = f"select user_id from public.social_profiles where user_id='{RECIPIENT}' for update;" if profile_wait else f"select id from public.circles where id='{CIRCLE}' for update;"
        first.stdin.write('begin; set statement_timeout=4000;\n' + (accept if acceptance_first else barrier) + '\n\\echo ready\n')
        first.stdin.flush()
        while first.stdout.readline().strip() != 'ready':
            assert first.poll() is None, first.stderr.read()
        second = subprocess.Popen(ARGS + ['-c', 'set statement_timeout=4000;' + (transition if acceptance_first else accept)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env={**os.environ, 'PGAPPNAME': 'acceptance-race'})
        deadline = time.monotonic() + 3
        while sql("select count(*) from pg_stat_activity where application_name='acceptance-race' and wait_event_type='Lock'") != '1':
            assert second.poll() is None, 'Operation failed before waiting for the Circle'
            assert time.monotonic() < deadline, 'Operation did not wait for the Circle'
            time.sleep(0.02)
        first.stdin.write(('' if acceptance_first else transition) + '\ncommit;\n\\q\n')
        first.stdin.flush()
        _, first_error = first.communicate(timeout=5)
        assert first.returncode == 0, first_error
        output, error = second.communicate(timeout=5)
        assert 'deadlock' not in error and 'timeout' not in error, error
        if acceptance_first:
            assert second.returncode == 0, (output, error)
        else:
            assert second.returncode != 0 and ('unavailable' in error or 'expired or was used' in error), (output, error)
        assert sql(f"select count(*) from public.circle_members where circle_id='{CIRCLE}' and user_id='{RECIPIENT}'") == ('1' if acceptance_first else '0')
        if transition_kind == 'replace':
            assert sql(f"select count(*) from public.circle_requests where circle_id='{CIRCLE}' and status='pending' and id<>'{invitation}'") == '1'
    finally:
        if first.poll() is None:
            first.kill()
            first.wait(timeout=5)
        if second is not None and second.poll() is None:
            second.kill()
            second.wait(timeout=5)


for kind in ('link', 'handle'):
    for transition in ('transfer', 'leave', 'alone'):
        for acceptance_first in (True, False):
            acceptance_race(kind, transition, acceptance_first)
        acceptance_race(kind, transition, False, True)
acceptance_race('handle', 'replace', False)
print('PASS: acceptance and invalidation follow Circle-first ordering without stale joins or deadlocks')


for kind in ('link', 'handle'):
    for allowance in (5, 10):
        fixture()
        sql(f"delete from public.circles where owner_id='{RECIPIENT}'; update public.social_profiles set plus_until=case when {allowance}=10 then 'infinity'::timestamptz else null end where user_id='{RECIPIENT}';")
        for _ in range(allowance):
            sql(auth(RECIPIENT) + 'select public.create_circle();')
        issued = sql(issue(kind))
        invitation = issued if kind == 'link' else sql(f"select id from public.circle_requests where circle_id='{CIRCLE}' and status='pending'")
        action = f"select public.join_circle('{invitation}');" if kind == 'link' else f"select public.answer_circle_invite('{invitation}',true);"
        result = subprocess.run(ARGS + ['-c', auth(RECIPIENT) + action], capture_output=True, text=True)
        assert result.returncode != 0 and f'Your Circle limit is {allowance}' in result.stderr, result.stderr
        assert sql(f"select count(*) from public.circle_members where circle_id='{CIRCLE}' and user_id='{RECIPIENT}'") == '0'
        sql(f"delete from public.circles where owner_id='{RECIPIENT}';")
    fixture()
    sql(f"""
    insert into auth.users select ('84000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,18) n on conflict do nothing;
    insert into public.circle_members(circle_id,user_id) select '{CIRCLE}',('84000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,18) n;
    """)
    issued = sql(issue(kind))
    invitation = issued if kind == 'link' else sql(f"select id from public.circle_requests where circle_id='{CIRCLE}' and status='pending'")
    action = f"select public.join_circle('{invitation}');" if kind == 'link' else f"select public.answer_circle_invite('{invitation}',true);"
    result = subprocess.run(ARGS + ['-c', auth(RECIPIENT) + action], capture_output=True, text=True)
    assert result.returncode != 0 and 'This circle is full' in result.stderr, result.stderr
print('PASS: link and handle acceptance preserve free/Plus membership limits and the 20-member cap')
