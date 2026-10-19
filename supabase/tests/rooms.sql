-- All fixtures are rolled back; no test users, grants, rooms or quota remain.
begin;
insert into auth.users(id) values('f1000000-0000-4000-8000-000000000001'),('f1000000-0000-4000-8000-000000000002'),('f1000000-0000-4000-8000-000000000003'),('f1000000-0000-4000-8000-000000000004');
select public.kingshot_discord_grant(id,'123456789012345678','1409235905629130915',true)
from auth.users where id::text like 'f1000000-0000-4000-8000-00000000000%';
do $$
declare
  owner uuid:='f1000000-0000-4000-8000-000000000001';
  commander uuid:='f1000000-0000-4000-8000-000000000002';
  member_id uuid:='f1000000-0000-4000-8000-000000000003';
  stranger uuid:='f1000000-0000-4000-8000-000000000004';
  result jsonb; code text; enemy uuid; before_ms numeric;
begin
  perform set_config('request.jwt.claim.sub',owner::text,true);
  result:=public.kingshot_room('create','',jsonb_build_object('name','Host'));
  code:=result->>'code';
  if result#>>'{members,0,role}'<>'owner' then raise exception 'TEST host'; end if;
  begin perform public.kingshot_room('create','',jsonb_build_object('name','Duplicate'));raise exception 'TEST one room';exception when others then if sqlerrm<>'KS_OWNED' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',commander::text,true);
  perform public.kingshot_room('join',code,jsonb_build_object('name','Commander'));
  perform set_config('request.jwt.claim.sub',member_id::text,true);
  perform public.kingshot_room('join',code,jsonb_build_object('name','Member'));
  begin perform public.kingshot_room('role',code,jsonb_build_object('userId',member_id,'role','commander'));raise exception 'TEST role escalation';exception when others then if sqlerrm<>'KS_ROLE' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',stranger::text,true);
  begin perform public.kingshot_room('read',code);raise exception 'TEST membership';exception when others then if sqlerrm<>'KS_MEMBER' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',owner::text,true);
  perform public.kingshot_room('role',code,jsonb_build_object('userId',commander,'role','commander'));
  perform set_config('request.jwt.claim.sub',commander::text,true);
  result:=public.kingshot_room('record',code,jsonb_build_object('name','Enemy','mode','marching','march',35,'at',extract(epoch from clock_timestamp())*1000));
  enemy:=(result#>>'{enemies,0,id}')::uuid;before_ms:=(result#>>'{enemies,0,arrivalAt}')::numeric;
  result:=public.kingshot_room('adjust',code,jsonb_build_object('id',enemy,'revision',1,'field','march','delta',0.1));
  if (result#>>'{enemies,0,arrivalAt}')::numeric-before_ms<>100 then raise exception 'TEST adjustment'; end if;
  begin perform public.kingshot_room('adjust',code,jsonb_build_object('id',enemy,'revision',1,'field','march','delta',1));raise exception 'TEST conflict';exception when others then if sqlerrm<>'KS_CONFLICT' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',member_id::text,true);
  begin perform public.kingshot_room('delete',code,jsonb_build_object('id',enemy,'revision',2));raise exception 'TEST commander only';exception when others then if sqlerrm<>'KS_ROLE' then raise;end if;end;
  perform public.kingshot_room('member',code,jsonb_build_object('name','Self','prepare',300,'march',27,'userId',owner));
  if (select march from kingshot_private.members where user_id=owner and room_id=(select id from kingshot_private.rooms where rooms.code=(result->>'code'))) is not null then raise exception 'TEST own march only';end if;
  delete from kingshot_private.access_grants where user_id=member_id;
  begin perform public.kingshot_room('read',code);raise exception 'TEST Discord grant';exception when others then if sqlerrm<>'KS_VERIFY' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',owner::text,true);
  update kingshot_private.settings set daily_updates=1;
  update kingshot_private.daily_usage set count=1 where day=(now() at time zone 'UTC')::date;
  begin perform public.kingshot_room('member',code,jsonb_build_object('name','Host','prepare',300,'march',30));raise exception 'TEST quota';exception when others then if sqlerrm<>'KS_QUOTA' then raise;end if;end;
  update kingshot_private.settings set daily_updates=1000;
  update kingshot_private.daily_usage set count=0;
  perform public.kingshot_room('close',code);
  begin perform public.kingshot_room('read',code);raise exception 'TEST closed';exception when others then if sqlerrm<>'KS_ROOM' then raise;end if;end;
end;
$$;
-- A logged-in account without a verified Discord grant sees no events.
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000003',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.kingshot_room_events) then raise exception 'TEST Realtime isolation';end if;
  begin perform public.kingshot_discord_grant('f1000000-0000-4000-8000-000000000003','123456789012345678','1409235905629130915',true);raise exception 'TEST grant privilege';exception when insufficient_privilege then null;end;
  begin perform 1 from kingshot_private.rooms;raise exception 'TEST private tables';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
select 'PASS: roles, membership, Discord grant, private table access, Realtime isolation, own march, exact adjustment, revision conflict, quota, closure; fixtures rolled back' as result;
