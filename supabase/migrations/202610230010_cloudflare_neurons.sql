-- Integer microneurons, shared by every action/model on the dedicated Workers Free account.
create table public.ai_daily_neurons(
 provider text not null default 'cloudflare' check(provider='cloudflare'),
 account text not null check(account ~ '^[a-f0-9]{32}$'),
 day date not null,
 unit text not null default 'microneurons' check(unit='microneurons'),
 reserved bigint not null default 0 check(reserved>=0),
 actual bigint not null default 0 check(actual>=0),
 primary key(provider,account,day),
 check(reserved+actual<=10000000000)
);
create table public.ai_neuron_reservations(
 id uuid primary key,
 provider text not null default 'cloudflare',
 account text not null,
 day date not null,
 model text not null default '@cf/meta/llama-3.3-70b-instruct-fp8-fast' check(model='@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
 reserved bigint not null check(reserved>0),
 actual bigint check(actual>=0 and actual<=reserved),
 outcome text not null default 'held' check(outcome in ('held','settled')),
 foreign key(provider,account,day) references public.ai_daily_neurons,
 check((actual is null and outcome='held') or (actual is not null and outcome='settled'))
);
alter table public.ai_daily_neurons enable row level security;
alter table public.ai_neuron_reservations enable row level security;
revoke all on public.ai_daily_neurons,public.ai_neuron_reservations from public,anon,authenticated;

create function public.reserve_ai_neurons(reservation uuid,account text,amount bigint) returns uuid
 language plpgsql security definer set search_path='' as $$
 declare target date:=(now() at time zone 'UTC')::date; total public.ai_daily_neurons;
 begin
  if account is null or account !~ '^[a-f0-9]{32}$' or amount is null or amount<=0 or amount>885798000 then raise exception 'Invalid neuron reservation'; end if;
  -- A 90-second attempt must finish before the provider resets at midnight UTC.
  if now() at time zone 'UTC'>=target+interval '1 day'-interval '5 minutes' then return null; end if;
  insert into public.ai_daily_neurons(account,day) values(account,target) on conflict do nothing;
  select * into total from public.ai_daily_neurons n where n.provider='cloudflare' and n.account=reserve_ai_neurons.account and n.day=target for update;
  if total.reserved+total.actual+amount>10000000000 then return null; end if;
  insert into public.ai_neuron_reservations(id,account,day,reserved) values(reservation,account,target,amount);
  update public.ai_daily_neurons n set reserved=n.reserved+amount where n.provider='cloudflare' and n.account=reserve_ai_neurons.account and n.day=target;
  return reservation;
 end;
$$;
create function public.settle_ai_neurons(reservation uuid,spent bigint) returns void
 language plpgsql security definer set search_path='' as $$
 declare held public.ai_neuron_reservations;
 begin
  select * into held from public.ai_neuron_reservations where id=reservation for update;
  if not found or spent is null or spent<0 or spent>held.reserved then raise exception 'Invalid neuron settlement'; end if;
  if held.actual is not null then return; end if;
  update public.ai_daily_neurons n set reserved=n.reserved-held.reserved,actual=n.actual+spent where n.provider=held.provider and n.account=held.account and n.day=held.day;
  update public.ai_neuron_reservations set actual=spent,outcome='settled' where id=reservation;
 end;
$$;
revoke all on function public.reserve_ai_neurons(uuid,text,bigint),public.settle_ai_neurons(uuid,bigint) from public,anon,authenticated;
grant execute on function public.reserve_ai_neurons(uuid,text,bigint),public.settle_ai_neurons(uuid,bigint) to service_role;
