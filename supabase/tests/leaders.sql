-- Permission and roster regressions. All fixtures and quota changes roll back.
begin;
insert into auth.users(id) values('f2000000-0000-4000-8000-000000000001'),('f2000000-0000-4000-8000-000000000002'),('f2000000-0000-4000-8000-000000000003'),('f2000000-0000-4000-8000-000000000004');
select public.kingshot_discord_grant(id,'123456789012345678','1409235905629130915',true)
from auth.users where id::text like 'f2000000-0000-4000-8000-00000000000%';
do $$
declare
  owner uuid:='f2000000-0000-4000-8000-000000000001';
  commander uuid:='f2000000-0000-4000-8000-000000000002';
  joiner uuid:='f2000000-0000-4000-8000-000000000003';
  outsider uuid:='f2000000-0000-4000-8000-000000000004';
  result jsonb; code text; linked uuid; manual uuid; rid uuid;
begin
  perform set_config('request.jwt.claim.sub',owner::text,true);
  result:=public.kingshot_room('create','',jsonb_build_object('name','Host'));
  code:=result->>'code';rid:=(result->>'roomId')::uuid;
  if jsonb_array_length(result->'leaders')<>0 then raise exception 'TEST host defaults to joiner';end if;
  perform set_config('request.jwt.claim.sub',commander::text,true);
  perform public.kingshot_room('join',code,jsonb_build_object('name','Commander'));
  perform set_config('request.jwt.claim.sub',joiner::text,true);
  perform public.kingshot_room('join',code,jsonb_build_object('name','Joiner'));
  result:=public.kingshot_room('member',code,jsonb_build_object('name','Forged','userId',owner,'prepare',999,'march',27));
  if jsonb_array_length(result->'leaders')<>0 then raise exception 'TEST march does not promote joiner';end if;
  if (select prepare<>300 or name<>'Joiner' or march<>27 from kingshot_private.members where room_id=rid and user_id=joiner) then raise exception 'TEST member only changes own march';end if;
  if (select march from kingshot_private.members where room_id=rid and user_id=owner) is not null then raise exception 'TEST no editing other march';end if;
  begin perform public.kingshot_room('leader',code,jsonb_build_object('op','save','name','Forged','prepare',0,'march',10));raise exception 'TEST joiner promotion';exception when others then if sqlerrm<>'KS_ROLE' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',owner::text,true);
  perform public.kingshot_room('role',code,jsonb_build_object('userId',commander,'role','commander'));
  perform set_config('request.jwt.claim.sub',commander::text,true);
  result:=public.kingshot_room('leader',code,jsonb_build_object('op','save','userId',joiner,'name','Ignored','prepare',120,'march',99));
  linked:=(result#>>'{leaders,0,id}')::uuid;
  if result#>>'{leaders,0,name}'<>'Joiner' or (result#>>'{leaders,0,march}')::numeric<>27 then raise exception 'TEST linked member data';end if;
  begin perform public.kingshot_room('leader',code,jsonb_build_object('op','save','userId',joiner,'prepare',300));raise exception 'TEST duplicate leader';exception when others then if sqlerrm<>'KS_LEADER' then raise;end if;end;
  begin perform public.kingshot_room('leader',code,jsonb_build_object('op','save','userId',outsider,'prepare',300));raise exception 'TEST select nonmember';exception when others then if sqlerrm<>'KS_MEMBER' then raise;end if;end;
  result:=public.kingshot_room('leader',code,jsonb_build_object('op','save','id',linked,'revision',1,'userId',joiner,'prepare',60));
  begin perform public.kingshot_room('leader',code,jsonb_build_object('op','delete','id',linked,'revision',1));raise exception 'TEST stale leader';exception when others then if sqlerrm<>'KS_CONFLICT' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',joiner::text,true);
  result:=public.kingshot_room('member',code,jsonb_build_object('march',28,'prepare',0));
  if (result#>>'{leaders,0,march}')::numeric<>28 or (result#>>'{leaders,0,prepare}')::numeric<>60 then raise exception 'TEST own march follows selected leader without changing preparation';end if;
  begin perform public.kingshot_room('leader',code,jsonb_build_object('op','save','id',linked,'revision',2,'userId',joiner,'prepare',0));raise exception 'TEST selected leader cannot edit preparation';exception when others then if sqlerrm<>'KS_ROLE' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',owner::text,true);
  result:=public.kingshot_room('leader',code,jsonb_build_object('op','save','name','Outside <leader>','prepare',90,'march',40));
  manual:=(result#>>'{leaders,1,id}')::uuid;
  if jsonb_array_length(result->'leaders')<>2 or result#>>'{leaders,1,name}'<>'Outside <leader>' then raise exception 'TEST manual leader';end if;
  -- Linked leaders may await their member's first march; no invented time.
  result:=public.kingshot_room('leader',code,jsonb_build_object('op','save','userId',owner,'prepare',180));
  if result#>'{leaders,2,march}'<>'null'::jsonb then raise exception 'TEST pending march';end if;
  -- Capacity applies to manual and selected leaders together.
  insert into kingshot_private.rally_leaders(room_id,name,prepare,march) select rid,'Capacity '||i,300,30 from generate_series(1,27) i;
  begin perform public.kingshot_room('leader',code,jsonb_build_object('op','save','name','Overflow','prepare',300,'march',30));raise exception 'TEST leader capacity';exception when others then if sqlerrm<>'KS_LEADERS' then raise;end if;end;
  delete from kingshot_private.rally_leaders where room_id=rid and name like 'Capacity %';
  result:=public.kingshot_room('leader',code,jsonb_build_object('op','delete','id',linked,'revision',2));
  if not exists(select 1 from kingshot_private.members where room_id=rid and user_id=joiner) then raise exception 'TEST removing leader preserves member';end if;
  perform set_config('request.jwt.claim.sub',commander::text,true);
  perform public.kingshot_room('leader',code,jsonb_build_object('op','save','userId',joiner,'prepare',45));
  perform set_config('request.jwt.claim.sub',joiner::text,true);
  perform public.kingshot_room('leave',code);
  if exists(select 1 from kingshot_private.rally_leaders where room_id=rid and user_id=joiner) then raise exception 'TEST departed leader removed';end if;
  if not exists(select 1 from kingshot_private.rally_leaders where room_id=rid and id=manual) then raise exception 'TEST manual leader preserved';end if;
end;
$$;
set local role authenticated;
do $$ begin
  begin perform 1 from kingshot_private.rally_leaders;raise exception 'TEST private leader table';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
select 'PASS: joiner default, own march only, host/commander selection, preparation permissions, manual leaders, duplicates, stale revisions, pending march, leader capacity, removal/leave, private table; fixtures rolled back' as result;
