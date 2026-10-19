-- Room membership and rally leadership are independent. Existing members stay joiners.
create table kingshot_private.rally_leaders (
  room_id uuid not null references kingshot_private.rooms(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  name text not null check(length(name) between 1 and 40),
  prepare numeric not null default 300 check(prepare between 0 and 604800),
  march numeric check(march>0 and march<=604800),
  revision bigint not null default 1,
  created_at timestamptz not null default clock_timestamp(),
  primary key(room_id,id),
  unique(room_id,user_id),
  foreign key(room_id,user_id) references kingshot_private.members(room_id,user_id) on delete cascade,
  check(user_id is not null or march is not null)
);
alter table kingshot_private.rally_leaders enable row level security;
revoke all on kingshot_private.rally_leaders from public,anon,authenticated;
create policy internal_deny on kingshot_private.rally_leaders for all to anon,authenticated using(false) with check(false);

create or replace function kingshot_private.kingshot_room(p_action text,p_code text default '',p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid(); r kingshot_private.rooms; m kingshot_private.members;
  e kingshot_private.enemies; leader kingshot_private.rally_leaders; cfg kingshot_private.settings;
  linked uuid;
  nick text; eid uuid; expected bigint; ts timestamptz; delta numeric; n integer;
  payload jsonb; changed boolean:=false;
begin
  if uid is null then raise exception 'KS_LOGIN'; end if;
  if pg_column_size(p_data)>16384 then raise exception 'KS_SIZE'; end if;
  if not exists(select 1 from kingshot_private.access_grants where user_id=uid and valid_until>now()) then raise exception 'KS_VERIFY'; end if;
  select * into cfg from kingshot_private.settings;
  if p_action='access' then return jsonb_build_object('allowed',true,'serverNow',extract(epoch from clock_timestamp())*1000); end if;
  if p_action not in ('read','create','join','member','leader','role','record','adjust','delete','leave','close') then raise exception 'KS_ACTION'; end if;
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
      update kingshot_private.members set march=(p_data->>'march')::numeric
      where room_id=r.id and user_id=uid;
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
    'me',uid,'serverNow',extract(epoch from clock_timestamp())*1000,
    'members',coalesce((select jsonb_agg(jsonb_build_object('id',user_id,'name',name,'role',role,'prepare',prepare,'march',march) order by role='owner' desc,name) from kingshot_private.members where room_id=r.id),'[]'::jsonb),
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
