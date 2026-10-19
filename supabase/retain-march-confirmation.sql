-- Called only by the validated private room RPC, with its invoker privileges.
create or replace function kingshot_private.battle_mutate(p_action text,uid uuid,r kingshot_private.rooms,m kingshot_private.members,p_data jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare eid uuid; ts timestamptz; delta numeric; target_time timestamptz; lead_seconds numeric; max_seconds numeric;
  order_row kingshot_private.rally_orders; new_mode text;
begin
  if auth.uid() is distinct from uid then raise exception 'KS_LOGIN'; end if;
    if p_action='command' then
      if m.role not in ('owner','commander') then raise exception 'KS_ROLE'; end if;
      if coalesce((p_data->>'revision')::bigint,-1)<>r.battle_revision then raise exception 'KS_CONFLICT'; end if;
      new_mode:=p_data->>'mode';
      if new_mode is null or new_mode not in ('hold','attack','defend') then raise exception 'KS_ACTION'; end if;
      update kingshot_private.rooms set battle_revision=battle_revision+1,battle_mode=new_mode,
        plan_id=case when new_mode='attack' then plan_id else null end,
        plan_target=case when new_mode='attack' then plan_target else null end,
        command_note=coalesce(p_data->>'note',command_note),battle_margin=coalesce((p_data->>'margin')::numeric,battle_margin),
        march_check_at=case when coalesce((p_data->>'check')::boolean,false) then clock_timestamp() else march_check_at end
      where id=r.id;
      if new_mode<>'attack' then delete from kingshot_private.rally_orders where room_id=r.id; end if;
    elsif p_action='publish' then
      if m.role not in ('owner','commander') then raise exception 'KS_ROLE'; end if;
      if coalesce((p_data->>'revision')::bigint,-1)<>r.battle_revision then raise exception 'KS_CONFLICT'; end if;
      if not exists(select 1 from kingshot_private.rally_leaders where room_id=r.id) then raise exception 'KS_NO_LEADERS'; end if;
      if exists(select 1 from kingshot_private.rally_leaders l left join kingshot_private.members mm on mm.room_id=l.room_id and mm.user_id=l.user_id
        where l.room_id=r.id and l.user_id is not null and (mm.march_updated_at is null or mm.march_updated_at<r.march_check_at)) then raise exception 'KS_MARCH_CHECK'; end if;
      select max(l.prepare+case when l.user_id is null then l.march else mm.march end) into max_seconds
        from kingshot_private.rally_leaders l left join kingshot_private.members mm on mm.room_id=l.room_id and mm.user_id=l.user_id where l.room_id=r.id;
      lead_seconds:=coalesce((p_data->>'lead')::numeric,10);
      if lead_seconds is null or lead_seconds<1 or lead_seconds>3600 then raise exception 'KS_TIME'; end if;
      target_time:=case when p_data->>'target' is null then clock_timestamp()+(max_seconds+lead_seconds)*interval '1 second' else to_timestamp((p_data->>'target')::numeric/1000) end;
      if target_time is null or target_time>=r.expires_at or target_time<=clock_timestamp() then raise exception 'KS_TIME'; end if;
      delete from kingshot_private.rally_orders where room_id=r.id;
      insert into kingshot_private.rally_orders(room_id,id,user_id,name,prepare,march,planned_launch_at,launch_at)
        select r.id,l.id,l.user_id,coalesce(mm.name,l.name),l.prepare,case when l.user_id is null then l.march else mm.march end,
          target_time-(l.prepare+case when l.user_id is null then l.march else mm.march end)*interval '1 second',
          target_time-(l.prepare+case when l.user_id is null then l.march else mm.march end)*interval '1 second'
        from kingshot_private.rally_leaders l left join kingshot_private.members mm on mm.room_id=l.room_id and mm.user_id=l.user_id where l.room_id=r.id;
      if exists(select 1 from kingshot_private.rally_orders where room_id=r.id and launch_at<=clock_timestamp()) then raise exception 'KS_TIME'; end if;
      update kingshot_private.rooms set battle_revision=battle_revision+1,plan_id=gen_random_uuid(),plan_target=target_time,battle_mode='attack' where id=r.id;
    elsif p_action='rally_adjust' then
      if m.role not in ('owner','commander') then raise exception 'KS_ROLE'; end if;
      eid:=(p_data->>'id')::uuid;
      if (p_data->>'planId')::uuid is distinct from r.plan_id then raise exception 'KS_CONFLICT'; end if;
      select * into order_row from kingshot_private.rally_orders where room_id=r.id and id=eid;
      if order_row.id is null or order_row.revision<>coalesce((p_data->>'revision')::bigint,0) then raise exception 'KS_CONFLICT'; end if;
      if p_data->>'at' is not null then ts:=to_timestamp((p_data->>'at')::numeric/1000);
      else
        delta:=(p_data->>'delta')::numeric;
        if delta is null or delta not in (-1,-0.1,0.1,1) then raise exception 'KS_TIME'; end if;
        ts:=order_row.launch_at+delta*interval '1 second';
      end if;
      if ts is null or ts<r.created_at-interval '5 minutes' or ts>=r.expires_at then raise exception 'KS_TIME'; end if;
      update kingshot_private.rally_orders set launch_at=ts,confirmed=confirmed or p_data->>'at' is not null,revision=revision+1 where room_id=r.id and id=eid;
    end if;
end;$$;
revoke all on function kingshot_private.battle_mutate(text,uuid,kingshot_private.rooms,kingshot_private.members,jsonb) from public,anon,authenticated;

