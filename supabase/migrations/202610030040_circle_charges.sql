alter table public.circle_forecasts add column charged_at timestamptz;

create function public.mark_circle_charged(forecast uuid) returns void
 language plpgsql security definer set search_path='' as $$
 begin
  update public.circle_forecasts set charged_at=coalesce(charged_at,now())
   where id=forecast and asker_id=auth.uid();
  if not found then raise exception 'Only the asker can mark this reading charged'; end if;
 end;
$$;
revoke all on function public.mark_circle_charged(uuid) from public,anon;
grant execute on function public.mark_circle_charged(uuid) to authenticated;
