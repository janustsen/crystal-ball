-- All money is integer nanodollars. Only the service role can admit requests or change this ledger.
create table public.ai_monthly_spend(
 month date primary key,
 reserved bigint not null default 0 check(reserved>=0),
 actual bigint not null default 0 check(actual>=0),
 check(reserved+actual<=25000000000)
);
create table public.ai_spend_reservations(
 id uuid primary key,
 month date not null references public.ai_monthly_spend,
 reserved bigint not null check(reserved>0),
 actual bigint check(actual>=0 and actual<=reserved)
);
create table public.ai_daily_requests(
 user_id uuid not null references auth.users on delete cascade,
 day date not null,
 category text not null,
 requests integer not null check(requests>0),
 primary key(user_id,day,category)
);
alter table public.ai_monthly_spend enable row level security;
alter table public.ai_spend_reservations enable row level security;
alter table public.ai_daily_requests enable row level security;
revoke all on public.ai_monthly_spend,public.ai_spend_reservations,public.ai_daily_requests from public,anon,authenticated;

create function public.admit_ai_request(viewer uuid,action text) returns void
 language plpgsql security definer set search_path='' as $$
 declare b jsonb; slots integer; allowance integer; bucket text; used integer;
 begin
  -- reading_balance locks the profile, serializing admission against entitlement and reading charges.
  b:=public.reading_balance(viewer);
  slots:=(b->>'used')::integer+(b->>'packs')::integer+case
   when (b->>'plus')::boolean then greatest(0,10-(b->>'used')::integer)
   when (b->>'starter')::integer>0 then (b->>'starter')::integer
   else greatest(0,1-(b->>'used')::integer) end;
  case
   when action in ('predict','bond','social:friend','social:circle') then bucket:='reading'; allowance:=2*slots;
   when action='plan' then bucket:='plan'; allowance:=6*slots;
   when action='social:draft' then bucket:='draft'; allowance:=4*slots;
   when action='omen' then bucket:='omen'; allowance:=2;
   when action='insight' then bucket:='insight'; allowance:=3;
   when action='chart' then bucket:='chart'; allowance:=2;
   when action='year' then bucket:='year'; allowance:=2;
   else raise exception 'Unknown AI action';
  end case;
  insert into public.ai_daily_requests(user_id,day,category,requests)
   values(viewer,(now() at time zone 'UTC')::date,bucket,1)
   on conflict(user_id,day,category) do update set requests=ai_daily_requests.requests+1
   returning requests into used;
  if used>allowance then raise exception 'AI daily quota reached'; end if;
 end;
$$;

create function public.reserve_ai_spend(reservation uuid,amount bigint) returns uuid
 language plpgsql security definer set search_path='' as $$
 declare target date:=date_trunc('month',now() at time zone 'UTC')::date; total public.ai_monthly_spend;
 begin
  if amount is null or amount<=0 or amount>39591600 then raise exception 'Invalid AI reservation'; end if;
  -- No inference may straddle the billing month (attempts time out within 90s).
  if now() at time zone 'UTC'>=target+interval '1 month'-interval '5 minutes' then raise exception 'AI monthly budget reached'; end if;
  insert into public.ai_monthly_spend(month) values(target) on conflict do nothing;
  select * into total from public.ai_monthly_spend where month=target for update;
  if total.reserved+total.actual+amount>25000000000 then raise exception 'AI monthly budget reached'; end if;
  insert into public.ai_spend_reservations(id,month,reserved) values(reservation,target,amount);
  update public.ai_monthly_spend set reserved=ai_monthly_spend.reserved+amount where month=target;
  return reservation;
 end;
$$;

create function public.settle_ai_spend(reservation uuid,spent bigint) returns void
 language plpgsql security definer set search_path='' as $$
 declare held public.ai_spend_reservations;
 begin
  select * into held from public.ai_spend_reservations where id=reservation for update;
  if not found or spent is null or spent<0 or spent>held.reserved then raise exception 'Invalid AI settlement'; end if;
  if held.actual is not null then return; end if;
  update public.ai_monthly_spend set reserved=ai_monthly_spend.reserved-held.reserved,actual=ai_monthly_spend.actual+spent where month=held.month;
  update public.ai_spend_reservations set actual=spent where id=reservation;
 end;
$$;
revoke all on function public.admit_ai_request(uuid,text),public.reserve_ai_spend(uuid,bigint),public.settle_ai_spend(uuid,bigint) from public,anon,authenticated;
grant execute on function public.admit_ai_request(uuid,text),public.reserve_ai_spend(uuid,bigint),public.settle_ai_spend(uuid,bigint) to service_role;
