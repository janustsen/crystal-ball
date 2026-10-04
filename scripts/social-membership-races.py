import os
import subprocess
import time
from pathlib import Path

PSQL = str(Path(os.environ['PG_BIN']) / 'psql')
OWNER, MEMBER, CIRCLE, DRAFT, SEAL = [f'81000000-0000-0000-0000-{n:012d}' for n in range(1, 6)]


def sql(statement):
    return subprocess.check_output([PSQL, '-XAtq', '-v', 'ON_ERROR_STOP=1', '-c', statement], text=True).strip()


def auth(user):
    return f"set role authenticated; set request.jwt.claim.sub='{user}';"


def fixture():
    sql(f"""
        delete from public.circles where id='{CIRCLE}';
        delete from public.sealed_forecasts where sender_id in ('{OWNER}','{MEMBER}');
        insert into auth.users values ('{OWNER}'),('{MEMBER}') on conflict do nothing;
        insert into public.social_profiles(user_id,plus_until) values ('{OWNER}','infinity'),('{MEMBER}','infinity') on conflict do nothing;
        insert into public.circles(id,owner_id) values ('{CIRCLE}','{OWNER}');
        insert into public.circle_members(circle_id,user_id) values ('{CIRCLE}','{OWNER}'),('{CIRCLE}','{MEMBER}');
        insert into public.circle_forecast_drafts(id,user_id,circle_id,question,headline,due_date)
        values ('{DRAFT}','{MEMBER}','{CIRCLE}','Will we learn together?','A shared project awaits.',current_date+1);
        insert into public.social_drafts(id,user_id,kind,wording,theme)
        values ('{SEAL}','{MEMBER}','seal','A shared project awaits.','learning') on conflict do nothing;
    """)


def state():
    return sql("""select json_build_array(
        (select count(*) from public.circle_forecasts),
        (select count(*) from public.circle_votes),
        (select count(*) from public.sealed_forecasts),
        (select count(*) from public.social_notifications))""")


def race(action, departing, leave, message, actor=MEMBER):
    before = state()
    remover = subprocess.Popen([PSQL, '-XAtq', '-v', 'ON_ERROR_STOP=1'], stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    worker = None
    try:
        removal = f"select public.leave_circle('{CIRCLE}');" if leave else f"select public.manage_circle('{CIRCLE}','{departing}','remove');"
        remover.stdin.write('begin;\n' + auth(departing if leave else OWNER) + removal + '\n\\echo removed\n')
        remover.stdin.flush()
        while remover.stdout.readline().strip() != 'removed':
            if remover.poll() is not None:
                raise AssertionError(remover.stderr.read())
        worker = subprocess.Popen([PSQL, '-XAtq', '-v', 'ON_ERROR_STOP=1', '-c', auth(actor) + action],
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                                  env={**os.environ, 'PGAPPNAME': 'membership-race'})
        deadline = time.monotonic() + 5
        while sql("select count(*) from pg_stat_activity where application_name='membership-race' and wait_event_type='Lock'") != '1':
            assert worker.poll() is None, 'Operation bypassed the membership lock'
            assert time.monotonic() < deadline, 'Operation did not wait on membership removal'
            time.sleep(0.02)
        remover.stdin.write('commit;\n\\q\n')
        remover.stdin.flush()
        remover.wait(timeout=5)
        output, error = worker.communicate(timeout=5)
        assert worker.returncode != 0 and message in error, (output, error)
        assert state() == before, 'Rejected operation changed forecasts, votes, seals or notifications'
    finally:
        if remover.poll() is None:
            remover.stdin.write('rollback;\n\\q\n')
            remover.stdin.flush()
            remover.wait(timeout=5)
        if worker is not None and worker.poll() is None:
            worker.terminate()
            worker.wait(timeout=5)


publish = f"select (public.publish_circle_forecast('{DRAFT}')).id;"
send = f"select public.send_sealed_forecast('{SEAL}','{CIRCLE}','{OWNER}');"
vote = f"select public.vote_circle_forecast('{DRAFT}','yes');"
fixture()
assert sql(auth(MEMBER) + publish) == DRAFT
assert sql(auth(MEMBER) + publish) == DRAFT
assert sql("select count(*) from public.social_notifications where kind in ('forecast','vote')") == '3'
assert sql(auth(MEMBER) + send)
assert sql(f"select count(*) from public.sealed_forecasts where intended_recipient='{OWNER}'") == '1'
sql(f"update public.circle_forecasts set due_date=current_date where id='{DRAFT}'")
sql(auth(MEMBER) + vote)
assert sql(f"select vote from public.circle_votes where forecast_id='{DRAFT}' and user_id='{MEMBER}'") == 'yes'
print('PASS: publication, idempotent publication, targeted seal and vote succeed for members')

for leave in (False, True):
    for existing in (False, True):
        fixture()
        if existing:
            sql(auth(MEMBER) + publish)
        race(publish, MEMBER, leave, 'Approve a fresh Circle forecast first')
    fixture()
    sql(auth(MEMBER) + publish)
    sql(f"update public.circle_forecasts set due_date=current_date where id='{DRAFT}'")
    race(vote, MEMBER, leave, 'This check-in is unavailable')
    fixture()
    race(send, MEMBER, leave, 'Choose a Circle member')
fixture()
race(send, OWNER, True, 'Choose a Circle member')
fixture()
sql(f"update public.social_drafts set user_id='{OWNER}' where id='{SEAL}'")
race(f"select public.send_sealed_forecast('{SEAL}','{CIRCLE}','{MEMBER}');", MEMBER, False, 'Choose a Circle member', actor=OWNER)
print('PASS: removal/leave serializes publication, retries, voting and both seal participants without side effects')
