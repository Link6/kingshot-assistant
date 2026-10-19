-- Keep privilege-bearing routines out of the REST-exposed schema. Public
-- routines are invoker wrappers; private routines still check auth.uid().
grant usage on schema kingshot_private to authenticated;
alter function public.kingshot_can_read(uuid) set schema kingshot_private;
alter function public.kingshot_room(text,text,jsonb) set schema kingshot_private;
create function public.kingshot_can_read(p_room uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select kingshot_private.kingshot_can_read(p_room);
$$;
create function public.kingshot_room(p_action text,p_code text default '',p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$
  select kingshot_private.kingshot_room(p_action,p_code,p_data);
$$;
revoke all on function public.kingshot_can_read(uuid) from public,anon;
revoke all on function public.kingshot_room(text,text,jsonb) from public,anon;
grant execute on function public.kingshot_can_read(uuid),public.kingshot_room(text,text,jsonb) to authenticated;
create policy internal_deny on kingshot_private.settings for all to anon,authenticated using(false) with check(false);
create policy internal_deny on kingshot_private.access_grants for all to anon,authenticated using(false) with check(false);
create policy internal_deny on kingshot_private.rooms for all to anon,authenticated using(false) with check(false);
create policy internal_deny on kingshot_private.members for all to anon,authenticated using(false) with check(false);
create policy internal_deny on kingshot_private.enemies for all to anon,authenticated using(false) with check(false);
create policy internal_deny on kingshot_private.write_limits for all to anon,authenticated using(false) with check(false);
create policy internal_deny on kingshot_private.daily_usage for all to anon,authenticated using(false) with check(false);
