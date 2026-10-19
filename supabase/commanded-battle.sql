-- Commanded battle state is separate from every client's local workbench.
alter table kingshot_private.rooms
  add column battle_revision bigint not null default 0,
  add column battle_mode text not null default 'hold' check(battle_mode in ('hold','attack','defend')),
  add column command_note text not null default '' check(length(command_note)<=240),
  add column battle_margin numeric not null default 0.2 check(battle_margin between 0 and 30),
  add column march_check_at timestamptz not null default now(),
  add column plan_id uuid,
  add column plan_target timestamptz;
alter table kingshot_private.members add column march_updated_at timestamptz;
create table kingshot_private.rally_orders (
  room_id uuid not null,
  id uuid not null,
  user_id uuid,
  name text not null check(length(name) between 1 and 40),
  prepare numeric not null check(prepare between 0 and 604800),
  march numeric not null check(march>0 and march<=604800),
  planned_launch_at timestamptz not null,
  launch_at timestamptz not null,
  confirmed boolean not null default false,
  revision bigint not null default 1,
  primary key(room_id,id),
  foreign key(room_id,id) references kingshot_private.rally_leaders(room_id,id) on delete cascade
);
create index ks_orders_user on kingshot_private.rally_orders(user_id,room_id);
alter table kingshot_private.rally_orders enable row level security;
revoke all on kingshot_private.rally_orders from public,anon,authenticated;
create policy internal_deny on kingshot_private.rally_orders for all to anon,authenticated using(false) with check(false);

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

create or replace function kingshot_private.kingshot_room(p_action text,p_code text default '',p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid(); r kingshot_private.rooms; m kingshot_private.members;
  e kingshot_private.enemies; leader kingshot_private.rally_leaders; cfg kingshot_private.settings;
  linked uuid; target_time timestamptz; lead_seconds numeric; max_seconds numeric;
  order_row kingshot_private.rally_orders; new_mode text;
  nick text; eid uuid; expected bigint; ts timestamptz; delta numeric; n integer;
  payload jsonb; changed boolean:=false;
begin
  if uid is null then raise exception 'KS_LOGIN'; end if;
  if pg_column_size(p_data)>16384 then raise exception 'KS_SIZE'; end if;
  if not exists(select 1 from kingshot_private.access_grants where user_id=uid and valid_until>now()) then raise exception 'KS_VERIFY'; end if;
  select * into cfg from kingshot_private.settings;
  if p_action='access' then return jsonb_build_object('allowed',true,'serverNow',extract(epoch from clock_timestamp())*1000); end if;
  if p_action not in ('read','create','join','member','leader','command','publish','rally_adjust','role','record','adjust','delete','leave','close') then raise exception 'KS_ACTION'; end if;
  if p_action<>'read' then
    insert into kingshot_private.write_limits values(uid,date_trunc('minute',now()),1)
    on conflict(user_id) do update set minute=excluded.minute,
      count=case when kingshot_private.write_limits.minute=excluded.minute then kingshot_private.write_limits.count+1 else 1 end
    returning count into n;
    if n>60 then raise exception 'KS_RATE'; end if;
    insert into kingshot_private.daily_usage values((now() at time zone 'UTC')::date,1)
    on conflict(day) do update set count=kingshot_private.daily_usage.count+1 returning count into n;
    if n>cfg.daily_updates then raise exception 'KS_QUOTA'; end if;
  end if;
  if p_action='create' then
    -- Serialize creation so concurrent requests cannot exceed global capacity.
    perform pg_advisory_xact_lock(7214432);
    delete from kingshot_private.rooms where expires_at<=now();
    delete from kingshot_private.daily_usage where day<current_date-35;
    if exists(select 1 from kingshot_private.rooms where owner_id=uid and expires_at>now()) then raise exception 'KS_OWNED'; end if;
    if (select count(*) from kingshot_private.rooms where expires_at>now())>=cfg.max_rooms then raise exception 'KS_FULL'; end if;
    nick:=btrim(p_data->>'name');
    if nick is null or length(nick) not between 1 and 40 then raise exception 'KS_NAME'; end if;
    insert into kingshot_private.rooms(code,owner_id) values(upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),uid) returning * into r;
    insert into kingshot_private.members(room_id,user_id,name,role) values(r.id,uid,nick,'owner');
    insert into public.kingshot_room_events(room_id) values(r.id);
    changed:=true;
  else
    if p_code !~ '^[0-9A-Fa-f]{8}$' then raise exception 'KS_ROOM'; end if;
    if p_action='read' then
      select * into r from kingshot_private.rooms where code=upper(p_code) and expires_at>now();
    else
      select * into r from kingshot_private.rooms where code=upper(p_code) and expires_at>now() for update;
    end if;
    if r.id is null then raise exception 'KS_ROOM'; end if;
    select * into m from kingshot_private.members where room_id=r.id and user_id=uid;
    if p_action='join' and m.user_id is null then
      if (select count(*) from kingshot_private.members where room_id=r.id)>=cfg.max_members then raise exception 'KS_MEMBERS'; end if;
      nick:=btrim(p_data->>'name');
      if nick is null or length(nick) not between 1 and 40 then raise exception 'KS_NAME'; end if;
      insert into kingshot_private.members(room_id,user_id,name,role) values(r.id,uid,nick,'member') returning * into m;
      changed:=true;
    elsif m.user_id is null then raise exception 'KS_MEMBER'; end if;
    if p_action='member' then
      -- Members supply only their own march; preparation belongs to commanders.
      if (p_data->>'march') is null then raise exception 'KS_TIME'; end if;
      update kingshot_private.members set march=(p_data->>'march')::numeric,march_updated_at=clock_timestamp()
      where room_id=r.id and user_id=uid;
      changed:=true;
      -- A march correction updates active arrival estimates without moving the launch.
      update kingshot_private.rally_orders set march=(p_data->>'march')::numeric,revision=revision+1
      where room_id=r.id and user_id=uid and march is distinct from (p_data->>'march')::numeric;
    elsif p_action in ('command','publish','rally_adjust') then
      perform kingshot_private.battle_mutate(p_action,uid,r,m,p_data);
      changed:=true;
    elsif p_action='leader' then
      if m.role not in ('owner','commander') then raise exception 'KS_ROLE'; end if;
      eid:=nullif(p_data->>'id','')::uuid; expected:=coalesce((p_data->>'revision')::bigint,0);
      if eid is not null then
        select * into leader from kingshot_private.rally_leaders where room_id=r.id and id=eid;
        if leader.id is null or leader.revision<>expected then raise exception 'KS_CONFLICT'; end if;
      end if;
      if p_data->>'op'='delete' then
        if eid is null then raise exception 'KS_CONFLICT'; end if;
        delete from kingshot_private.rally_leaders where room_id=r.id and id=eid;
      elsif p_data->>'op'='save' then
        if eid is null and (select count(*) from kingshot_private.rally_leaders where room_id=r.id)>=30 then raise exception 'KS_LEADERS'; end if;
        linked:=nullif(p_data->>'userId','')::uuid;
        if linked is not null then
          select name into nick from kingshot_private.members where room_id=r.id and user_id=linked;
          if not found then raise exception 'KS_MEMBER'; end if;
          if exists(select 1 from kingshot_private.rally_leaders where room_id=r.id and user_id=linked and id<>coalesce(eid,gen_random_uuid())) then raise exception 'KS_LEADER'; end if;
        else
          nick:=btrim(p_data->>'name');
        end if;
        insert into kingshot_private.rally_leaders(room_id,id,user_id,name,prepare,march)
        values(r.id,coalesce(eid,gen_random_uuid()),linked,nick,(p_data->>'prepare')::numeric,
          case when linked is null then (p_data->>'march')::numeric else null end)
        on conflict(room_id,id) do update set user_id=excluded.user_id,name=excluded.name,prepare=excluded.prepare,march=excluded.march,
          revision=kingshot_private.rally_leaders.revision+1;
      else raise exception 'KS_ACTION'; end if;
      changed:=true;
    elsif p_action='role' then
      if m.role<>'owner' then raise exception 'KS_ROLE'; end if;
      if p_data->>'role' not in ('commander','member') then raise exception 'KS_ROLE'; end if;
      update kingshot_private.members set role=p_data->>'role'
      where room_id=r.id and user_id=(p_data->>'userId')::uuid and user_id<>r.owner_id;
      if not found then raise exception 'KS_MEMBER'; end if;
      changed:=true;
    elsif p_action in ('record','adjust','delete') then
      if m.role not in ('owner','commander') then raise exception 'KS_ROLE'; end if;
      eid:=nullif(p_data->>'id','')::uuid; expected:=coalesce((p_data->>'revision')::bigint,0);
      if eid is not null then
        select * into e from kingshot_private.enemies where room_id=r.id and id=eid;
        if e.id is null or e.revision<>expected then raise exception 'KS_CONFLICT'; end if;
      elsif p_action<>'record' then raise exception 'KS_CONFLICT'; end if;
      if p_action='record' then
        if eid is null and (select count(*) from kingshot_private.enemies where room_id=r.id)>=30 then raise exception 'KS_ENEMIES'; end if;
        ts:=to_timestamp((p_data->>'at')::numeric/1000);
        if ts is null or abs(extract(epoch from (clock_timestamp()-ts)))>30 then raise exception 'KS_CLOCK'; end if;
        if p_data->>'mode' not in ('marching','gathering') then raise exception 'KS_TIME'; end if;
        insert into kingshot_private.enemies(room_id,id,name,mode,prepare,march,recorded_at,depart_at,arrival_at)
        values(r.id,coalesce(eid,gen_random_uuid()),btrim(p_data->>'name'),p_data->>'mode',
          case when p_data->>'mode'='marching' then 0 else (p_data->>'prepare')::numeric end,(p_data->>'march')::numeric,ts,
          ts+case when p_data->>'mode'='marching' then interval '0 seconds' else (p_data->>'prepare')::numeric*interval '1 second' end,
          ts+(case when p_data->>'mode'='marching' then 0 else (p_data->>'prepare')::numeric end+(p_data->>'march')::numeric)*interval '1 second')
        on conflict(room_id,id) do update set name=excluded.name,mode=excluded.mode,prepare=excluded.prepare,march=excluded.march,
          recorded_at=excluded.recorded_at,depart_at=excluded.depart_at,arrival_at=excluded.arrival_at,revision=kingshot_private.enemies.revision+1;
      elsif p_action='adjust' then
        delta:=(p_data->>'delta')::numeric;
        if delta is null or delta not in (-1,-0.1,0.1,1) then raise exception 'KS_TIME'; end if;
        if p_data->>'field'='prepare' then
          if e.mode='marching' or e.depart_at<=clock_timestamp() or e.depart_at+delta*interval '1 second'<clock_timestamp() then raise exception 'KS_PHASE'; end if;
          update kingshot_private.enemies set prepare=prepare+delta,depart_at=depart_at+delta*interval '1 second',arrival_at=arrival_at+delta*interval '1 second',revision=revision+1 where room_id=r.id and id=eid;
        elsif p_data->>'field'='march' then
          update kingshot_private.enemies set march=march+delta,arrival_at=arrival_at+delta*interval '1 second',revision=revision+1 where room_id=r.id and id=eid;
        else raise exception 'KS_TIME'; end if;
      else delete from kingshot_private.enemies where room_id=r.id and id=eid; end if;
      changed:=true;
    elsif p_action='leave' then
      if m.role='owner' then raise exception 'KS_OWNER'; end if;
      delete from kingshot_private.members where room_id=r.id and user_id=uid;
      changed:=true;
    elsif p_action='close' then
      if m.role<>'owner' then raise exception 'KS_ROLE'; end if;
      update kingshot_private.rooms set expires_at=now() where id=r.id;
      changed:=true;
    end if;
  end if;
  if changed then
    update kingshot_private.rooms set revision=revision+1 where id=r.id returning * into r;
    update public.kingshot_room_events set revision=r.revision where room_id=r.id;
  end if;
  if p_action in ('leave','close') then return jsonb_build_object('left',true); end if;
  select jsonb_build_object('roomId',r.id,'code',r.code,'revision',r.revision,'expiresAt',extract(epoch from r.expires_at)*1000,
    'battle',jsonb_build_object('revision',r.battle_revision,'mode',r.battle_mode,'note',r.command_note,'margin',r.battle_margin,'marchCheckAt',extract(epoch from r.march_check_at)*1000),
    'plan',case when r.plan_id is null then null else jsonb_build_object('id',r.plan_id,'target',extract(epoch from r.plan_target)*1000,'rows',
      coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'userId',o.user_id,'name',o.name,'prepareSeconds',o.prepare,'marchSeconds',o.march,
        'plannedLaunchAt',extract(epoch from o.planned_launch_at)*1000,'launchAt',extract(epoch from o.launch_at)*1000,
        'arrivalAt',extract(epoch from (o.launch_at+(o.prepare+o.march)*interval '1 second'))*1000,'confirmed',o.confirmed,'revision',o.revision) order by o.launch_at,o.id)
        from kingshot_private.rally_orders o where o.room_id=r.id),'[]'::jsonb)) end,
    'me',uid,'serverNow',extract(epoch from clock_timestamp())*1000,
    'members',coalesce((select jsonb_agg(jsonb_build_object('id',user_id,'name',name,'role',role,'prepare',prepare,'march',march,'marchUpdatedAt',extract(epoch from march_updated_at)*1000) order by role='owner' desc,name) from kingshot_private.members where room_id=r.id),'[]'::jsonb),
    'leaders',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'userId',l.user_id,'name',coalesce(mm.name,l.name),
      'prepare',l.prepare,'march',case when l.user_id is null then l.march else mm.march end,'revision',l.revision) order by l.created_at,l.id)
      from kingshot_private.rally_leaders l left join kingshot_private.members mm on mm.room_id=l.room_id and mm.user_id=l.user_id
      where l.room_id=r.id),'[]'::jsonb),
    'enemies',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'mode',mode,'prepare',prepare,'march',march,'revision',revision,
      'recordedAt',extract(epoch from recorded_at)*1000,'departAt',extract(epoch from depart_at)*1000,'arrivalAt',extract(epoch from arrival_at)*1000) order by arrival_at,id)
      from kingshot_private.enemies where room_id=r.id),'[]'::jsonb)) into payload;
  return payload;
end;
$$;
revoke all on function kingshot_private.kingshot_room(text,text,jsonb) from public,anon;
grant execute on function kingshot_private.kingshot_room(text,text,jsonb) to authenticated;
