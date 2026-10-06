-- One free reading for sealed-link browser visitors: one per browser, one per network (salted IP hash) per UTC day,
-- and a global daily cap. Only the engine's service role claims or releases; clients have no access.
create table public.web_readings(
 kind text not null check(kind in ('browser','network')),
 key text not null check(length(key) between 1 and 128),
 day date not null,
 expires_at timestamptz not null,
 completed boolean not null default false,
 primary key(kind,key,day)
);
alter table public.web_readings enable row level security;
revoke all on public.web_readings from public,anon,authenticated;

create function public.claim_web_reading(browser text,network text,daily_cap integer) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
 declare today date:=(now() at time zone 'UTC')::date; expiry timestamptz:=clock_timestamp()+interval '10 minutes';
 begin
 perform pg_advisory_xact_lock(hashtext('public.web_readings'));
 delete from public.web_readings w where not w.completed and w.expires_at<=clock_timestamp();
 if exists(select 1 from public.web_readings w where w.kind='browser' and w.key=browser) then return jsonb_build_object('outcome','browser','day',today); end if;
 if exists(select 1 from public.web_readings w where w.kind='network' and w.key=network and w.day=today) then return jsonb_build_object('outcome','network','day',today); end if;
 if (select count(*) from public.web_readings w where w.kind='browser' and w.day=today)>=daily_cap then return jsonb_build_object('outcome','cap','day',today); end if;
 insert into public.web_readings(kind,key,day,expires_at) values('browser',browser,today,expiry),('network',network,today,expiry);
 return jsonb_build_object('outcome','ok','day',today,'expires_at',expiry);
 end $$;

-- A failed or blocked forecast returns the visitor's reading.
create function public.release_web_reading(browser text,network text,day date,expires_at timestamptz) returns void
 language sql volatile security definer set search_path='' as $$
 delete from public.web_readings w where not w.completed and w.expires_at=release_web_reading.expires_at and w.day=release_web_reading.day and ((w.kind='browser' and w.key=browser) or (w.kind='network' and w.key=network));
 $$;

create function public.complete_web_reading(browser text,network text,day date,expires_at timestamptz) returns boolean
 language plpgsql volatile security definer set search_path='' as $$
 begin
 perform pg_advisory_xact_lock(hashtext('public.web_readings'));
 update public.web_readings w set completed=true where w.kind='browser' and w.key=browser and w.day=complete_web_reading.day and w.expires_at=complete_web_reading.expires_at and w.expires_at>clock_timestamp();
 if not found then return false; end if;
 update public.web_readings w set completed=true where w.kind='network' and w.key=network and w.day=complete_web_reading.day and w.expires_at=complete_web_reading.expires_at;
 return true;
 end $$;

revoke all on function public.claim_web_reading(text,text,integer),public.release_web_reading(text,text,date,timestamptz),public.complete_web_reading(text,text,date,timestamptz) from public,anon,authenticated;
grant execute on function public.claim_web_reading(text,text,integer),public.release_web_reading(text,text,date,timestamptz),public.complete_web_reading(text,text,date,timestamptz) to service_role;
