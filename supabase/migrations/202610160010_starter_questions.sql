-- A new account's first 20 questions are free, counted over every reading it was ever charged; after them the free
-- allowance is 1 a day. Plus keeps 10 a day, and packs still cover readings beyond the free allowance and never expire.

alter table public.reading_charges drop constraint reading_charges_source_check,
 add constraint reading_charges_source_check check(source in ('daily','pack','starter'));

create or replace function public.reading_balance(viewer uuid) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
 begin
 insert into public.social_profiles(user_id) values(viewer) on conflict do nothing;
 perform 1 from public.social_profiles where user_id=viewer for update;
 return (select jsonb_build_object(
  'owner',viewer,
  'asOf',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'plus',coalesce(p.plus_until>now(),false),
  'plusUntil',p.plus_until,
  'packs',coalesce(p.packs,0),
  'used',(select count(*) from public.reading_charges c where c.user_id=viewer and c.day=(now() at time zone 'UTC')::date),
  'starter',greatest(0,20-(select count(*) from public.reading_charges c where c.user_id=viewer)),
  'day',(now() at time zone 'UTC')::date,
  'ballStyle',p.ball_style,
  'cardStyle',p.card_style,
  'yearAhead',p.year_ahead_source)
 from public.social_profiles p where p.user_id=viewer);
 end;
$$;

-- The first use of a reading is charged and one retry of it is free; every later use debits a new reading.
-- Free accounts spend the starter first, then the daily reading (none on a day the starter was in use), then packs.
create or replace function public.charge_reading(viewer uuid,reading text) returns jsonb
 language plpgsql security definer set search_path='' as $$
 declare today date:=(now() at time zone 'UTC')::date; profile public.social_profiles; used integer; asked integer; prior integer; target text:=reading; spent text;
 begin
  insert into public.social_profiles(user_id) values(viewer) on conflict do nothing;
  select * into profile from public.social_profiles where user_id=viewer for update;
  select uses into prior from public.reading_charges where user_id=viewer and reading_id=reading;
  if prior=1 then
   update public.reading_charges set uses=2 where user_id=viewer and reading_id=reading;
   return public.reading_balance(viewer);
  end if;
  if prior is not null then
   target:=reading||':'||prior;
   update public.reading_charges set uses=prior+1 where user_id=viewer and reading_id=reading;
  end if;
  select count(*) filter(where day=today),count(*) into used,asked from public.reading_charges where user_id=viewer;
  if coalesce(profile.plus_until>now(),false) then
   if used<10 then spent:='daily'; end if;
  elsif asked<20 then spent:='starter';
  elsif used<1 then spent:='daily';
  end if;
  if spent is null and profile.packs>0 then
   update public.social_profiles set packs=packs-1 where user_id=viewer;
   spent:='pack';
  end if;
  if spent is null then raise exception 'No readings left today'; end if;
  insert into public.reading_charges(user_id,reading_id,day,source) values(viewer,target,today,spent);
  return public.reading_balance(viewer);
 end;
$$;
