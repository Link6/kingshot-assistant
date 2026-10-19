begin;
insert into auth.users(id) values('f2000000-0000-4000-8000-000000000001'),('f2000000-0000-4000-8000-000000000002'),('f2000000-0000-4000-8000-000000000003'),('f2000000-0000-4000-8000-000000000004');
select public.kingshot_discord_grant(id,'123456789012345678','1409235905629130915',true)
from auth.users where id::text like 'f2000000-0000-4000-8000-00000000000%';
do $$
declare u1 uuid:='f2000000-0000-4000-8000-000000000001';u2 uuid:='f2000000-0000-4000-8000-000000000002';u3 uuid:='f2000000-0000-4000-8000-000000000003';u4 uuid:='f2000000-0000-4000-8000-000000000004';s jsonb;c text;
begin
  perform set_config('request.jwt.claim.sub',u1::text,true);s:=public.kingshot_room('create','',jsonb_build_object('name','Limit1'));c:=s->>'code';
  perform set_config('request.jwt.claim.sub',u2::text,true);perform public.kingshot_room('create','',jsonb_build_object('name','Limit2'));
  perform set_config('request.jwt.claim.sub',u3::text,true);perform public.kingshot_room('create','',jsonb_build_object('name','Limit3'));
  perform set_config('request.jwt.claim.sub',u4::text,true);
  begin perform public.kingshot_room('create','',jsonb_build_object('name','Limit4'));raise exception 'TEST global cap';exception when others then if sqlerrm<>'KS_FULL' then raise;end if;end;
  update kingshot_private.settings set max_members=2;
  perform set_config('request.jwt.claim.sub',u2::text,true);perform public.kingshot_room('join',c,jsonb_build_object('name','Member2'));
  perform set_config('request.jwt.claim.sub',u3::text,true);
  begin perform public.kingshot_room('join',c,jsonb_build_object('name','Member3'));raise exception 'TEST member cap';exception when others then if sqlerrm<>'KS_MEMBERS' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',u1::text,true);
  update kingshot_private.write_limits set minute=date_trunc('minute',now()),count=60 where user_id=u1;
  begin perform public.kingshot_room('member',c,jsonb_build_object('name','Rate','prepare',300,'march',30));raise exception 'TEST write rate';exception when others then if sqlerrm<>'KS_RATE' then raise;end if;end;
  update kingshot_private.access_grants set valid_until=now()-interval '1 second' where user_id=u1;
  begin perform public.kingshot_room('read',c);raise exception 'TEST expired grant';exception when others then if sqlerrm<>'KS_VERIFY' then raise;end if;end;
  perform public.kingshot_discord_grant(u1,'123456789012345678','1409235905629130915',true);
  update kingshot_private.rooms set expires_at=now()-interval '1 second' where code=c;
  begin perform public.kingshot_room('read',c);raise exception 'TEST expiry';exception when others then if sqlerrm<>'KS_ROOM' then raise;end if;end;
end;$$;
rollback;
select 'PASS: global room cap, per-room member cap, write rate, expired Discord grant, room expiry; fixtures rolled back' as result;
