-- Assertions run in a subtransaction: even successful fixtures roll back.
do $test$
declare
  host uuid:='f7000000-0000-4000-8000-000000000001';
  cmd uuid:='f7000000-0000-4000-8000-000000000002';
  member_id uuid:='f7000000-0000-4000-8000-000000000003';
  result jsonb; code text; rid uuid; manual uuid; linked uuid; pending uuid; old_launch timestamptz; old_battle bigint;
begin
  begin
    insert into auth.users(id) values(host),(cmd),(member_id);
    perform public.kingshot_discord_grant(id,'123456789012345678','1409235905629130915',true)
      from auth.users where id in(host,cmd,member_id);
    perform set_config('request.jwt.claim.sub',host::text,true);
    result:=public.kingshot_room('create','',jsonb_build_object('name','Toggle host'));
    code:=result->>'code';rid:=(result->>'roomId')::uuid;
    perform set_config('request.jwt.claim.sub',cmd::text,true);
    perform public.kingshot_room('join',code,jsonb_build_object('name','Commander'));
    perform set_config('request.jwt.claim.sub',member_id::text,true);
    perform public.kingshot_room('join',code,jsonb_build_object('name','Member'));
    perform public.kingshot_room('member',code,jsonb_build_object('march',27));
    perform set_config('request.jwt.claim.sub',host::text,true);
    perform public.kingshot_room('role',code,jsonb_build_object('userId',cmd,'role','commander'));
    result:=public.kingshot_room('leader',code,jsonb_build_object('op','save','name','Manual','prepare',300,'march',40));
    manual:=(result#>>'{leaders,0,id}')::uuid;
    if result#>'{leaders,0,enabled}'<>'true'::jsonb then raise exception 'TEST default enabled';end if;
    result:=public.kingshot_room('leader',code,jsonb_build_object('op','save','userId',member_id,'prepare',60));
    linked:=(result#>>'{leaders,1,id}')::uuid;
    result:=public.kingshot_room('publish',code,jsonb_build_object('revision',result#>'{battle,revision}','lead',20));
    select launch_at into old_launch from kingshot_private.rally_orders where room_id=rid and id=manual;
    old_battle:=(result#>>'{battle,revision}')::bigint;
    perform set_config('request.jwt.claim.sub',member_id::text,true);
    begin
      perform public.kingshot_room('leader',code,jsonb_build_object('op','toggle','id',linked,'revision',1,'enabled',false));
      raise exception 'TEST member toggle allowed';
    exception when others then if sqlerrm<>'KS_ROLE' then raise;end if;end;
    perform set_config('request.jwt.claim.sub',cmd::text,true);
    result:=public.kingshot_room('leader',code,jsonb_build_object('op','toggle','id',linked,'revision',1,'enabled',false));
    if jsonb_array_length(result->'leaders')<>1 or jsonb_array_length(result->'disabledLeaders')<>1 or jsonb_array_length(result#>'{plan,rows}')<>1 then raise exception 'TEST disable snapshot';end if;
    if result#>>'{disabledLeaders,0,id}'<>linked::text or result#>'{disabledLeaders,0,enabled}'<>'false'::jsonb or (result#>>'{disabledLeaders,0,prepare}')::numeric<>60 then raise exception 'TEST retained configuration';end if;
    if (select launch_at from kingshot_private.rally_orders where room_id=rid and id=manual)<>old_launch then raise exception 'TEST other launch moved';end if;
    if (result#>>'{battle,revision}')::bigint<>old_battle+1 then raise exception 'TEST publish revision not advanced';end if;
    if (select revision from public.kingshot_room_events where room_id=rid)<>(result->>'revision')::bigint then raise exception 'TEST missing broadcast';end if;
    begin
      perform public.kingshot_room('publish',code,jsonb_build_object('revision',old_battle));raise exception 'TEST stale publish accepted';
    exception when others then if sqlerrm<>'KS_CONFLICT' then raise;end if;end;
    begin
      perform public.kingshot_room('leader',code,jsonb_build_object('op','toggle','id',linked,'revision',1,'enabled',true));raise exception 'TEST stale toggle accepted';
    exception when others then if sqlerrm<>'KS_CONFLICT' then raise;end if;end;
    begin
      perform public.kingshot_room('leader',code,jsonb_build_object('op','toggle','id',linked,'revision',2,'enabled','true'));raise exception 'TEST string boolean accepted';
    exception when others then if sqlerrm<>'KS_ACTION' then raise;end if;end;
    -- Editing retained data must not enable a leader implicitly.
    result:=public.kingshot_room('leader',code,jsonb_build_object('op','save','id',linked,'revision',2,'userId',member_id,'prepare',90));
    if jsonb_array_length(result->'disabledLeaders')<>1 then raise exception 'TEST edit re-enabled leader';end if;
    perform set_config('request.jwt.claim.sub',member_id::text,true);
    result:=public.kingshot_room('member',code,jsonb_build_object('march',28));
    if (result#>>'{disabledLeaders,0,march}')::numeric<>28 then raise exception 'TEST disabled march not current';end if;
    perform set_config('request.jwt.claim.sub',host::text,true);
    result:=public.kingshot_room('leader',code,jsonb_build_object('op','save','userId',host,'prepare',600));
    pending:=(result#>>'{leaders,1,id}')::uuid;
    result:=public.kingshot_room('leader',code,jsonb_build_object('op','toggle','id',pending,'revision',1,'enabled',false));
    result:=public.kingshot_room('publish',code,jsonb_build_object('revision',result#>'{battle,revision}','lead',10));
    if jsonb_array_length(result#>'{plan,rows}')<>1 or (result#>>'{plan,rows,0,marchSeconds}')::numeric<>40 then raise exception 'TEST disabled leaders in publish';end if;
    if abs((result#>>'{plan,target}')::numeric-(result->>'serverNow')::numeric-350000)>2000 then raise exception 'TEST disabled longest duration affected target';end if;
    result:=public.kingshot_room('leader',code,jsonb_build_object('op','toggle','id',manual,'revision',1,'enabled',false));
    if result->'plan'<>'null'::jsonb or jsonb_array_length(result->'leaders')<>0 then raise exception 'TEST all off plan not cleared';end if;
    begin
      perform public.kingshot_room('publish',code,jsonb_build_object('revision',result#>'{battle,revision}'));raise exception 'TEST all off publish allowed';
    exception when others then if sqlerrm<>'KS_NO_LEADERS' then raise;end if;end;
    result:=public.kingshot_room('leader',code,jsonb_build_object('op','toggle','id',linked,'revision',3,'enabled',true));
    result:=public.kingshot_room('publish',code,jsonb_build_object('revision',result#>'{battle,revision}'));
    if jsonb_array_length(result#>'{plan,rows}')<>1 or result#>>'{plan,rows,0,id}'<>linked::text or (result#>>'{plan,rows,0,marchSeconds}')::numeric<>28 or (result#>>'{plan,rows,0,prepareSeconds}')::numeric<>90 then raise exception 'TEST re-enable retained values';end if;
    raise exception 'ROLLBACK_TOGGLE_FIXTURES';
  exception when others then
    if sqlerrm<>'ROLLBACK_TOGGLE_FIXTURES' then raise;end if;
  end;
  if exists(select 1 from auth.users where id in(host,cmd,member_id)) then raise exception 'TEST fixtures leaked';end if;
end;$test$;
select 'PASS: defaults, host/commander permissions, member denial, revisions, retained configuration, active-only snapshots, remaining launch preservation, disabled march updates, publish filters, all off, re-enable; fixtures rolled back' as result;
