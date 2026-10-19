-- Run sequentially with the other suites. All fixtures and quota roll back.
begin;
insert into auth.users(id) values('f3000000-0000-4000-8000-000000000001'),('f3000000-0000-4000-8000-000000000002'),('f3000000-0000-4000-8000-000000000003');
select public.kingshot_discord_grant(id,'123456789012345678','1409235905629130915',true)
from auth.users where id::text like 'f3000000-0000-4000-8000-00000000000%';
do $$
declare
  owner uuid:='f3000000-0000-4000-8000-000000000001';
  commander uuid:='f3000000-0000-4000-8000-000000000002';
  member_id uuid:='f3000000-0000-4000-8000-000000000003';
  s jsonb; c text; rid uuid; leader uuid; plan uuid; old_plan uuid; arrival numeric; launch numeric; manual_arrival numeric; rev bigint;
begin
  perform set_config('request.jwt.claim.sub',owner::text,true);
  s:=public.kingshot_room('create','',jsonb_build_object('name','Battle host'));c:=s->>'code';rid:=(s->>'roomId')::uuid;
  if s#>>'{battle,mode}'<>'hold' or s->'plan'<>'null'::jsonb then raise exception 'TEST initial standby';end if;
  perform set_config('request.jwt.claim.sub',commander::text,true);
  perform public.kingshot_room('join',c,jsonb_build_object('name','Commander'));
  perform set_config('request.jwt.claim.sub',member_id::text,true);
  s:=public.kingshot_room('join',c,jsonb_build_object('name','Leader'));
  begin perform public.kingshot_room('publish',c,jsonb_build_object('revision',s#>'{battle,revision}'));raise exception 'TEST member publish';exception when others then if sqlerrm<>'KS_ROLE' then raise;end if;end;
  begin perform public.kingshot_room('command',c,jsonb_build_object('mode','defend','revision',s#>'{battle,revision}'));raise exception 'TEST member command';exception when others then if sqlerrm<>'KS_ROLE' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',owner::text,true);
  perform public.kingshot_room('role',c,jsonb_build_object('userId',commander,'role','commander'));
  s:=public.kingshot_room('leader',c,jsonb_build_object('op','save','userId',member_id,'prepare',30));
  leader:=(s#>>'{leaders,0,id}')::uuid;
  begin perform public.kingshot_room('publish',c,jsonb_build_object('revision',s#>'{battle,revision}','lead',10));raise exception 'TEST unconfirmed leader';exception when others then if sqlerrm<>'KS_MARCH_CHECK' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',member_id::text,true);
  s:=public.kingshot_room('member',c,jsonb_build_object('march',20,'userId',owner,'prepare',999,'mode','attack'));
  if s#>>'{battle,mode}'<>'hold' or (s#>>'{leaders,0,prepare}')::numeric<>30 then raise exception 'TEST self march does not control battle';end if;
  perform set_config('request.jwt.claim.sub',commander::text,true);
  s:=public.kingshot_room('leader',c,jsonb_build_object('op','save','name','Manual','prepare',15,'march',10));
  s:=public.kingshot_room('publish',c,jsonb_build_object('revision',s#>'{battle,revision}','lead',10));
  plan:=(s#>>'{plan,id}')::uuid;old_plan:=plan;
  if s#>>'{battle,mode}'<>'attack' or jsonb_array_length(s#>'{plan,rows}')<>2 then raise exception 'TEST shared plan';end if;
  launch:=(s#>>'{plan,rows,0,launchAt}')::numeric;arrival:=(s#>>'{plan,rows,0,arrivalAt}')::numeric;
  manual_arrival:=(s#>>'{plan,rows,1,arrivalAt}')::numeric;
  if arrival<>manual_arrival then raise exception 'TEST common arrival';end if;
  s:=public.kingshot_room('rally_adjust',c,jsonb_build_object('planId',plan,'id',leader,'revision',1,'delta',0.1));
  if (s#>>'{plan,rows,0,arrivalAt}')::numeric<>arrival+100 or (s#>>'{plan,rows,0,plannedLaunchAt}')::numeric<>launch then raise exception 'TEST exact tenth calibration';end if;
  if (s#>>'{plan,rows,1,arrivalAt}')::numeric<>manual_arrival then raise exception 'TEST other rally unchanged';end if;
  begin perform public.kingshot_room('rally_adjust',c,jsonb_build_object('planId',plan,'id',leader,'revision',1,'delta',1));raise exception 'TEST stale order';exception when others then if sqlerrm<>'KS_CONFLICT' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',member_id::text,true);
  s:=public.kingshot_room('member',c,jsonb_build_object('march',21));
  if (s#>>'{plan,rows,0,arrivalAt}')::numeric<>arrival+1100 or (s#>>'{plan,rows,0,launchAt}')::numeric<>launch+100 then raise exception 'TEST march updates landing without moving launch';end if;
  begin perform public.kingshot_room('rally_adjust',c,jsonb_build_object('planId',plan,'id',leader,'revision',3,'delta',1));raise exception 'TEST member calibration';exception when others then if sqlerrm<>'KS_ROLE' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',commander::text,true);
  s:=public.kingshot_room('command',c,jsonb_build_object('mode','defend','revision',s#>'{battle,revision}','note','Defend castle','margin',0.3));
  if s#>>'{battle,mode}'<>'defend' or s#>>'{battle,note}'<>'Defend castle' then raise exception 'TEST command shared';end if;
  if s->'plan'<>'null'::jsonb then raise exception 'TEST changing operation cancels old attack orders';end if;
  if not (select march_updated_at>=(select march_check_at from kingshot_private.rooms where id=rid) from kingshot_private.members where room_id=rid and user_id=member_id) then raise exception 'TEST mode switch must preserve march confirmation';end if;
  rev:=(s#>>'{battle,revision}')::bigint;
  begin perform public.kingshot_room('command',c,jsonb_build_object('mode','hold','revision',rev-1));raise exception 'TEST stale command';exception when others then if sqlerrm<>'KS_CONFLICT' then raise;end if;end;
  s:=public.kingshot_room('command',c,jsonb_build_object('mode','defend','revision',rev,'check',true));
  begin perform public.kingshot_room('publish',c,jsonb_build_object('revision',s#>'{battle,revision}'));raise exception 'TEST explicit check prevents stale publish';exception when others then if sqlerrm<>'KS_MARCH_CHECK' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',member_id::text,true);
  s:=public.kingshot_room('member',c,jsonb_build_object('march',21));
  perform set_config('request.jwt.claim.sub',owner::text,true);
  s:=public.kingshot_room('publish',c,jsonb_build_object('revision',s#>'{battle,revision}','lead',5));plan:=(s#>>'{plan,id}')::uuid;
  if plan=old_plan then raise exception 'TEST new round identity';end if;
  begin perform public.kingshot_room('rally_adjust',c,jsonb_build_object('planId',old_plan,'id',leader,'revision',1,'delta',1));raise exception 'TEST old round cannot overwrite new';exception when others then if sqlerrm<>'KS_CONFLICT' then raise;end if;end;
  s:=public.kingshot_room('rally_adjust',c,jsonb_build_object('planId',plan,'id',leader,'revision',1,'at',extract(epoch from clock_timestamp())*1000));
  if s#>>'{plan,rows,0,confirmed}'<>'true' then raise exception 'TEST actual launch recorded';end if;
  s:=public.kingshot_room('command',c,jsonb_build_object('mode','hold','revision',s#>'{battle,revision}'));
  if s#>>'{battle,mode}'<>'hold' then raise exception 'TEST hold pauses shared action';end if;
  if s->'plan'<>'null'::jsonb then raise exception 'TEST hold clears executable plan';end if;
end;$$;
-- Public invoker wrapper still works for a real authenticated database role.
select set_config('request.jwt.claim.sub','f3000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select public.kingshot_room('access');
do $$ begin
  begin perform 1 from kingshot_private.rally_orders;raise exception 'TEST private orders';exception when insufficient_privilege then null;end;
  if has_function_privilege('authenticated','kingshot_private.battle_mutate(text,uuid,kingshot_private.rooms,kingshot_private.members,jsonb)','execute') then raise exception 'TEST internal command function must be private';end if;
end;$$;
reset role;
rollback;
select 'PASS: shared commands and plan, role checks, fresh march checks, exact per-rally calibration, live arrival correction, stale revision/round protection, hold, private orders; fixtures rolled back' as result;
