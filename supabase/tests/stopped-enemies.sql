-- All fixture users, room state and quota changes are rolled back.
begin;
insert into auth.users(id) values('f4000000-0000-4000-8000-000000000001'),('f4000000-0000-4000-8000-000000000002'),('f4000000-0000-4000-8000-000000000003');
select public.kingshot_discord_grant(id,'123456789012345678','1409235905629130915',true)
from auth.users where id::text like 'f4000000-0000-4000-8000-00000000000%';
do $$
declare
  owner uuid:='f4000000-0000-4000-8000-000000000001';cmd uuid:='f4000000-0000-4000-8000-000000000002';member_id uuid:='f4000000-0000-4000-8000-000000000003';
  s jsonb;c text;rid uuid;enemy uuid;other uuid;other_arrival numeric;at_ms numeric;before_rev bigint;
begin
  perform set_config('request.jwt.claim.sub',owner::text,true);
  s:=public.kingshot_room('create','',jsonb_build_object('name','Stop host'));c:=s->>'code';rid:=(s->>'roomId')::uuid;
  perform set_config('request.jwt.claim.sub',cmd::text,true);perform public.kingshot_room('join',c,jsonb_build_object('name','Commander'));
  perform set_config('request.jwt.claim.sub',member_id::text,true);perform public.kingshot_room('join',c,jsonb_build_object('name','Member'));
  perform set_config('request.jwt.claim.sub',owner::text,true);perform public.kingshot_room('role',c,jsonb_build_object('userId',cmd,'role','commander'));
  at_ms:=floor(extract(epoch from clock_timestamp())*1000);
  s:=public.kingshot_room('record',c,jsonb_build_object('name','Enemy A','mode','gathering','prepare',300,'march',30,'at',at_ms));enemy:=(s#>>'{enemies,0,id}')::uuid;
  s:=public.kingshot_room('record',c,jsonb_build_object('name','Enemy B','mode','gathering','prepare',300,'march',34,'at',at_ms));other:=(s#>>'{enemies,1,id}')::uuid;other_arrival:=(s#>>'{enemies,1,arrivalAt}')::numeric;
  before_rev:=(s->>'revision')::bigint;
  perform set_config('request.jwt.claim.sub',member_id::text,true);
  begin perform public.kingshot_room('stop_enemy',c,jsonb_build_object('id',enemy,'revision',1));raise exception 'TEST member stop';exception when others then if sqlerrm<>'KS_ROLE' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',cmd::text,true);
  s:=public.kingshot_room('stop_enemy',c,jsonb_build_object('id',enemy,'revision',1));
  if jsonb_array_length(s->'enemies')<>1 or jsonb_array_length(s->'stoppedEnemies')<>1 then raise exception 'TEST active-only compatibility snapshot';end if;
  if (s#>>'{enemies,0,id}')::uuid<>other or (s#>>'{enemies,0,arrivalAt}')::numeric<>other_arrival then raise exception 'TEST other attack unchanged';end if;
  if s#>>'{stoppedEnemies,0,name}'<>'Enemy A' or s#>>'{stoppedEnemies,0,active}'<>'false' then raise exception 'TEST stopped draft retained';end if;
  if (s->>'revision')::bigint<>before_rev+1 or (select revision from public.kingshot_room_events where room_id=rid)<>before_rev+1 then raise exception 'TEST stop broadcasts new room revision';end if;
  begin perform public.kingshot_room('adjust',c,jsonb_build_object('id',enemy,'revision',2,'field','march','delta',1));raise exception 'TEST stopped attack cannot drift';exception when others then if sqlerrm<>'KS_PHASE' then raise;end if;end;
  begin perform public.kingshot_room('record',c,jsonb_build_object('id',enemy,'revision',1,'name','Stale','mode','gathering','prepare',300,'march',30,'at',at_ms));raise exception 'TEST stale restart';exception when others then if sqlerrm<>'KS_CONFLICT' then raise;end if;end;
  at_ms:=floor(extract(epoch from clock_timestamp())*1000);
  s:=public.kingshot_room('record',c,jsonb_build_object('id',enemy,'revision',2,'name','Enemy A','mode','gathering','prepare',290,'march',30,'at',at_ms));
  if jsonb_array_length(s->'enemies')<>2 or jsonb_array_length(s->'stoppedEnemies')<>0 then raise exception 'TEST fresh recording reactivates draft';end if;
  if not exists(select 1 from kingshot_private.enemies where room_id=rid and id=enemy and active and revision=3 and recorded_at=to_timestamp(at_ms/1000) and arrival_at=to_timestamp((at_ms+320000)/1000)) then raise exception 'TEST restart uses fresh absolute deadlines';end if;
  begin perform public.kingshot_room('stop_enemy',c,jsonb_build_object('id',enemy,'revision',2));raise exception 'TEST old stop cannot cancel restarted attack';exception when others then if sqlerrm<>'KS_CONFLICT' then raise;end if;end;
end;$$;
rollback;
select 'PASS: commander-only stop, draft retention, active-only snapshots for old clients, room broadcast, stopped adjustment denied, stale writes rejected, fresh re-recording; fixtures rolled back' as result;
