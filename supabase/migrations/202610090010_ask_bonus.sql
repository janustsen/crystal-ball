-- The Ball asks: one bonus reading per 25 distinct questions answered. Each bonus number credits once per user through
-- the pack ledger, so a repeated or concurrent claim never grants twice; bonus readings never expire, like packs.
create function public.grant_ask_bonus(viewer uuid,bonuses integer) returns jsonb
 language plpgsql security definer set search_path='' as $$
 declare granted integer;
 begin
  if bonuses is null or bonuses<0 or bonuses>20 then raise exception 'Invalid bonus count'; end if;
  insert into public.social_profiles(user_id) values(viewer) on conflict do nothing;
  perform 1 from public.social_profiles where user_id=viewer for update;
  with fresh as (
   insert into public.pack_purchases(transaction_id,user_id,readings)
   select 'ask-bonus:'||viewer||':'||n,viewer,1 from generate_series(1,bonuses) n
   on conflict do nothing returning readings)
  select coalesce(sum(readings),0) into granted from fresh;
  update public.social_profiles set packs=packs+granted where user_id=viewer;
  return public.reading_balance(viewer);
 end;
$$;
revoke all on function public.grant_ask_bonus(uuid,integer) from public,anon,authenticated;
grant execute on function public.grant_ask_bonus(uuid,integer) to service_role;
