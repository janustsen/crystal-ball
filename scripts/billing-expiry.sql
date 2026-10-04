\set QUIET 1
begin;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.social_profiles(user_id,age_band,friends_can_ask,plus,plus_until) values
 ('00000000-0000-0000-0000-000000000001','adult',true,false,now()+interval '1 week'),
 ('00000000-0000-0000-0000-000000000002','adult',true,false,null);
insert into public.social_drafts(id,user_id,kind,wording,theme) values
 ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','seal','A shared skill awaits.','growth');
do $$
declare viewer uuid:='00000000-0000-0000-0000-000000000001'; target uuid:='00000000-0000-0000-0000-000000000002'; c uuid; extra uuid; expiry timestamptz;
begin
 perform set_config('request.jwt.claim.sub',viewer::text,true);
 c:=public.create_circle();
 insert into public.circle_members(circle_id,user_id) values(c,target);
 perform public.authorize_friend_reading(viewer,c,target);
 perform public.seal_forecast('20000000-0000-0000-0000-000000000001');
 perform public.seal_forecast('20000000-0000-0000-0000-000000000001');
 for i in 2..5 loop perform public.create_circle(); end loop;
 extra:=public.create_circle();
 delete from public.circles where id=extra;
 foreach expiry in array array[now()-interval '1 second',null] loop
  update public.social_profiles set plus=true,plus_until=expiry where user_id=viewer;
  if (public.reading_balance(viewer)->>'plus')::boolean then raise exception 'Expired balance still grants Plus'; end if;
  begin
   perform public.authorize_friend_reading(viewer,c,target);
   raise exception 'Expired friend reading allowed' using errcode='XX000';
  exception when raise_exception then
   if sqlerrm<>'Friend readings are a Plus extra' then raise; end if;
  end;
  begin
   perform public.seal_forecast('20000000-0000-0000-0000-000000000001');
   raise exception 'Expired unlimited seal allowed' using errcode='XX000';
  exception when raise_exception then
   if sqlerrm<>'Your free seal is used this week. Plus has unlimited seals' then raise; end if;
  end;
  begin
   perform public.create_circle();
   raise exception 'Expired sixth Circle allowed' using errcode='XX000';
  exception when raise_exception then
   if sqlerrm<>'Your Circle limit is 5' then raise; end if;
  end;
 end loop;
end;
$$;
rollback;
\echo 'PASS: active, expired and absent subscriptions govern friend readings, seals and Circle limits'
