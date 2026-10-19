-- Fixture users, room changes and exhausted quotas are rolled back.
begin;
insert into auth.users(id) values('f5000000-0000-4000-8000-000000000001'),('f5000000-0000-4000-8000-000000000002'),('f5000000-0000-4000-8000-000000000003');
select public.kingshot_discord_grant(id,'123456789012345678','1409235905629130915',true)
from auth.users where id::text like 'f5000000-0000-4000-8000-00000000000%';
do $$
declare
  owner_id uuid:='f5000000-0000-4000-8000-000000000001'; other_id uuid:='f5000000-0000-4000-8000-000000000002';
  outsider uuid:='f5000000-0000-4000-8000-000000000003';
  s jsonb; c text; other_code text; rid uuid; rev bigint; count_before integer; max_count integer;
begin
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  if public.kingshot_room('owned')->>'owned'<>'false' then raise exception 'TEST no existing room';end if;
  s:=public.kingshot_room('create','',jsonb_build_object('name','Recovery owner'));c:=s->>'code';rid:=(s->>'roomId')::uuid;rev:=(s->>'revision')::bigint;
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  s:=public.kingshot_room('create','',jsonb_build_object('name','Other owner'));other_code:=s->>'code';
  perform public.kingshot_room('join',c,jsonb_build_object('name','Member'));
  begin perform public.kingshot_room('close',c);raise exception 'TEST cross-owner closure';exception when others then if sqlerrm<>'KS_ROLE' then raise;end if;end;
  s:=public.kingshot_room('owned',c,jsonb_build_object('userId',owner_id));
  if s->>'code'<>other_code then raise exception 'TEST caller cannot discover another owner';end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  if public.kingshot_room('owned',c,jsonb_build_object('userId',owner_id))->>'owned'<>'false' then raise exception 'TEST no ownership disclosure';end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform public.kingshot_room('join',other_code,jsonb_build_object('name','Visiting member'));
  select revision into rev from kingshot_private.rooms where id=rid;
  select count into count_before from kingshot_private.daily_usage where day=(now() at time zone 'UTC')::date;
  s:=public.kingshot_room('owned','',jsonb_build_object('userId',other_id));
  if s->>'code'<>c or (s->>'roomId')::uuid<>rid or (s->>'revision')::bigint<>rev then raise exception 'TEST ownership restore preserves room';end if;
  if (select count from kingshot_private.daily_usage where day=(now() at time zone 'UTC')::date)<>count_before then raise exception 'TEST discovery is read-only';end if;
  select daily_updates into max_count from kingshot_private.settings;
  update kingshot_private.daily_usage set count=max_count where day=(now() at time zone 'UTC')::date;
  update kingshot_private.write_limits set minute=date_trunc('minute',now()),count=60 where user_id=owner_id;
  s:=public.kingshot_room('owned');
  if s->>'code'<>c then raise exception 'TEST recovery works at quota';end if;
  s:=public.kingshot_room('close',c);
  if s->>'left'<>'true' or exists(select 1 from kingshot_private.rooms where id=rid and expires_at>now()) then raise exception 'TEST server closure at quota';end if;
  if (select revision from public.kingshot_room_events where room_id=rid)<>rev+1 then raise exception 'TEST closure broadcasts';end if;
  if not exists(select 1 from kingshot_private.rooms where code=other_code and expires_at>now()) then raise exception 'TEST another owner preserved';end if;
  if public.kingshot_room('owned')->>'owned'<>'false' then raise exception 'TEST closed room not recovered';end if;
  s:=public.kingshot_room('leave',other_code);
  if s->>'left'<>'true' then raise exception 'TEST leave works at quota';end if;
  if (select count from kingshot_private.daily_usage where day=(now() at time zone 'UTC')::date)<>max_count or (select count from kingshot_private.write_limits where user_id=owner_id)<>60 then raise exception 'TEST exit does not consume update quota';end if;
  update kingshot_private.daily_usage set count=count_before where day=(now() at time zone 'UTC')::date;
  update kingshot_private.write_limits set count=0 where user_id=owner_id;
  s:=public.kingshot_room('create','',jsonb_build_object('name','New room'));
  if s->>'code'=c then raise exception 'TEST new room after closure';end if;
  delete from kingshot_private.access_grants where user_id=owner_id;
  begin perform public.kingshot_room('owned');raise exception 'TEST recovery requires Discord grant';exception when others then if sqlerrm<>'KS_VERIFY' then raise;end if;end;
  perform set_config('request.jwt.claim.sub','',true);
  begin perform public.kingshot_room('owned');raise exception 'TEST recovery requires login';exception when others then if sqlerrm<>'KS_LOGIN' then raise;end if;end;
  if has_function_privilege('anon','public.kingshot_room(text,text,jsonb)','EXECUTE') then raise exception 'TEST anonymous RPC denied';end if;
end;$$;
rollback;
select 'PASS: owner-only read-only discovery, no cross-owner disclosure or closure, quota-independent close/leave, close broadcast, new room after close, JWT and Discord checks; fixtures rolled back' as result;
