(function(){
  'use strict';
  const $=id=>document.getElementById(id),I=window.KingshotI18n,K=window.KingshotTiming,B=window.KingshotRoomBridge;
  const t=(k,p)=>I.t(k,p),cfg=window.KingshotRoomConfig,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const scope=new URL('.',location.href).pathname,storageKey=`kingshot:${scope}:room`,providerKey=storageKey+':discord';
  let client,session=null,allowed=false,room=null,channel=null,busy=false,connected=false,realtimeReady=false,offset=0,bestRtt=Infinity,uncertainty=0,reading=false,refreshTimer,verifiedAt=0;
  const role=()=>room?.members.find(m=>m.id===room.me)?.role;
  const roleText=r=>t(r==='owner'?'roomOwner':r==='commander'?'roomCommander':'roomMember');
  function error(key){$('room-error').hidden=!key;$('room-error').textContent=key?t(key):'';}
  function online(flag){connected=flag&&realtimeReady;B.setOnline(connected);renderStatus();}
  function renderStatus(){
    $('room-summary').textContent=room?room.code+' · '+t(connected?'roomOnlineShort':'roomOfflineShort'):t(allowed?'roomVerified':'roomSolo');
    $('room-panel').classList.toggle('sync-offline',!!room&&!connected);
    $('room-account').textContent=t(allowed?'roomVerified':session?'roomVerify':'roomNeedLogin');
    $('room-login').hidden=!!session&&allowed;$('room-logout').hidden=!session;
    $('room-entry').hidden=!allowed||!!room;$('room-live').hidden=!room;
    for(const id of ['room-login','room-create','room-join','room-save-self'])$(id).disabled=busy||(['room-create','room-join','room-save-self'].includes(id)&&!allowed);
    if(!room)return;
    $('room-code').textContent=room.code;$('room-leave').textContent=t(role()==='owner'?'roomClose':'roomLeave');
    $('room-sync').textContent=connected?t('roomConnected',{role:roleText(role()),ms:Math.ceil(uncertainty),expiry:new Date(room.expiresAt).toLocaleTimeString(I.language)})+(uncertainty>500?' · '+t('roomClockWarning'):''):t('roomOffline');
    $('room-sync').classList.toggle('disconnected',!connected);
    $('room-enemy-form').hidden=role()==='member';
    $('room-enemy-form').querySelectorAll('input,select,button').forEach(el=>el.disabled=!allowed||!connected||busy);
    $('room-enemy-prepare').disabled=!allowed||!connected||busy||$('room-enemy-mode').value==='marching';
    $('room-save-self').disabled=busy||!allowed||!connected;
    $('room-members').querySelectorAll('select').forEach(el=>el.disabled=busy||!allowed||!connected);
  }
  function renderMembers(){
    if(!room)return;
    $('room-members').innerHTML=room.members.map(m=>`<div class="room-member"><div><b>${esc(m.name)}</b><small>${m.march==null?'—':esc(m.prepare+' / '+m.march+' '+t('seconds'))}</small></div>${role()==='owner'&&m.role!=='owner'?`<select data-room-role="${esc(m.id)}" aria-label="${esc(m.name+' '+t('roomRoleHint'))}"><option value="member" ${m.role==='member'?'selected':''}>${t('roomMember')}</option><option value="commander" ${m.role==='commander'?'selected':''}>${t('roomCommander')}</option></select>`:`<span class="pill neutral">${roleText(m.role)}</span>`}</div>`).join('');
    const selected=$('room-enemy-select').value;
    $('room-enemy-select').innerHTML=`<option value="">${t('roomNewEnemy')}</option>`+room.enemies.map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('');
    if(room.enemies.some(e=>e.id===selected))$('room-enemy-select').value=selected;
    renderStatus();
  }
  function saveCode(code){try{if(code)localStorage.setItem(storageKey,code);else localStorage.removeItem(storageKey);}catch{}}
  async function clearRoom(remember=false){if(channel){await client.removeChannel(channel);channel=null;}room=null;connected=false;realtimeReady=false;if(!remember)saveCode('');B.clear();renderStatus();}
  function trackClock(snapshot,start,elapsed){
    if(!snapshot?.serverNow)return;
    if(elapsed<bestRtt||Math.abs(snapshot.serverNow-(start+elapsed/2)-offset)>3000){bestRtt=elapsed;offset=snapshot.serverNow-(start+elapsed/2);uncertainty=elapsed/2;}
  }
  async function rpc(action,code,data={}){
    const start=Date.now(),mono=performance.now();
    const {data:result,error:err}=await client.rpc('kingshot_room',{p_action:action,p_code:code||'',p_data:data});
    if(err)throw err;trackClock(result,start,performance.now()-mono);return result;
  }
  function apply(snapshot){
    if(!snapshot?.roomId)return;
    if(room&&room.roomId===snapshot.roomId&&snapshot.revision<room.revision)return;
    const first=!room;room=snapshot;
    if(first){const me=room.members.find(m=>m.id===room.me);$('room-prepare').value=String(me.prepare);$('room-march').value=me.march==null?'':String(me.march);}
    B.apply(room,offset,realtimeReady);saveCode(room.code);online(true);renderMembers();
  }
  async function handleError(err){
    const msg=String(err?.message||err);
    if(msg.includes('KS_VERIFY')||msg.includes('KS_LOGIN')){allowed=false;online(false);error('roomReauth');}
    else if(/KS_(FULL|MEMBERS|ENEMIES|QUOTA|RATE)/.test(msg))error('roomQuota');
    else if(msg.includes('KS_OWNED'))error('roomOwned');
    else if(/KS_(ROLE|MEMBER)/.test(msg))error('roomPermission');
    else if(msg.includes('KS_CONFLICT')){error('roomConflict');await refresh();}
    else if(msg.includes('KS_ROOM')&&room){await clearRoom();error('roomGone');}
    else if(/KS_(TIME|NAME|CLOCK|PHASE)|invalid input|constraint|row-level/i.test(msg))error('roomInvalid');
    else{online(false);error('roomUnavailable');}
    renderStatus();
  }
  async function refresh(){
    if(!room||!allowed||reading)return;
    reading=true;
    try{apply(await rpc('read',room.code));}catch(err){await handleError(err);}finally{reading=false;}
  }
  async function subscribe(){
    realtimeReady=false;if(channel)await client.removeChannel(channel);
    channel=client.channel('kingshot:'+room.roomId).on('postgres_changes',{event:'UPDATE',schema:'public',table:'kingshot_room_events',filter:'room_id=eq.'+room.roomId},()=>{
      clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,60);
    }).subscribe(status=>{if(status==='SUBSCRIBED'){realtimeReady=true;refresh();}else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){realtimeReady=false;online(false);}});
  }
  async function verify(){
    if(!session)return false;
    const providerToken=sessionStorage.getItem(providerKey);
    if(!providerToken){allowed=false;online(false);error('roomReauth');renderStatus();return false;}
    const response=await fetch(cfg.url+'/functions/v1/discord-access',{method:'POST',headers:{apikey:cfg.key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({providerToken}),signal:AbortSignal.timeout(15000)});
    if(!response.ok){
      allowed=false;online(false);
      error(response.status===403?'roomNotMember':response.status===401?'roomReauth':'roomUnavailable');renderStatus();return false;
    }
    allowed=true;verifiedAt=Date.now();error('');await rpc('access');renderStatus();return true;
  }
  async function run(action,data={},code=room?.code){
    if(busy||!allowed)return;
    busy=true;error('');renderStatus();
    try{
      const result=await rpc(action,code,data);
      if(result.left)await clearRoom();
      else{const first=!room;const recorded=action==='record'?result.enemies.find(e=>data.id?e.id===data.id:e.name===data.name&&Math.abs(e.recordedAt-data.at)<1):null;apply(result);if(recorded)$('room-enemy-select').value=recorded.id;if(first)await subscribe();}
    }catch(err){await handleError(err);}finally{busy=false;renderStatus();}
  }
  async function authChanged(next){
    session=next;allowed=false;
    if(!session){try{sessionStorage.removeItem(providerKey);}catch{}online(false);if(room)await clearRoom(true);renderStatus();return;}
    try{
      if(await verify()){
        let saved='';try{saved=localStorage.getItem(storageKey)||'';}catch{}
        if(saved&&!room){try{apply(await rpc('read',saved));await subscribe();}catch(err){saveCode('');await handleError(err);}}
      }
    }catch(err){await handleError(err);}renderStatus();
  }
  function storageAdapter(){return {
    getItem:key=>{try{return localStorage.getItem(key);}catch{return null;}},
    setItem(key,value){try{
      const data=JSON.parse(value);
      if(data.provider_token)sessionStorage.setItem(providerKey,data.provider_token);
      delete data.provider_token;delete data.provider_refresh_token;
      localStorage.setItem(key,JSON.stringify(data));
    }catch{}},
    removeItem:key=>{try{localStorage.removeItem(key);}catch{}}
  };}
  function init(){
    if(location.protocol==='file:'||window.kingshotDesktop){$('room-login').disabled=true;error('roomWebOnly');return;}
    if(!cfg?.url||!cfg?.key||!window.supabase){$('room-login').disabled=true;error('roomUnavailable');return;}
    client=window.supabase.createClient(cfg.url,cfg.key,{auth:{flowType:'pkce',storage:storageAdapter(),persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:storageKey+':auth'}});
    client.auth.onAuthStateChange((event,next)=>{
      if(next?.provider_token)try{sessionStorage.setItem(providerKey,next.provider_token);}catch{}
      if(event==='TOKEN_REFRESHED'){session=next;return;}
      setTimeout(()=>authChanged(next),0);
    });
    $('room-login').addEventListener('click',async()=>{
      error('');
      try{
        const settings=await fetch(cfg.url+'/auth/v1/settings',{headers:{apikey:cfg.key},signal:AbortSignal.timeout(10000)}).then(r=>r.json());
        if(!settings.external?.discord){error('roomProviderSetup');return;}
        const {error:err}=await client.auth.signInWithOAuth({provider:'discord',options:{scopes:'guilds.members.read',redirectTo:new URL('.',location.href).href}});if(err)throw err;
      }catch(err){await handleError(err);}
    });
    $('room-logout').addEventListener('click',async()=>{try{sessionStorage.removeItem(providerKey);await client.auth.signOut();}catch(err){await handleError(err);}});
    $('room-create').addEventListener('click',()=>run('create',{name:$('room-name').value.trim()}));
    $('room-join').addEventListener('click',()=>run('join',{name:$('room-name').value.trim()},$('room-code-input').value.trim().toUpperCase()));
    $('room-save-self').addEventListener('click',()=>{try{run('member',{name:room.members.find(m=>m.id===room.me).name,prepare:K.parseDuration($('room-prepare').value),march:K.parseDuration($('room-march').value,false)});}catch{error('roomInvalid');}});
    $('room-members').addEventListener('change',e=>{if(e.target.dataset.roomRole)run('role',{userId:e.target.dataset.roomRole,role:e.target.value});});
    $('room-enemy-select').addEventListener('change',()=>{
      const enemy=room.enemies.find(e=>e.id===$('room-enemy-select').value);
      if(enemy){$('room-enemy-name').value=enemy.name;$('room-enemy-mode').value=enemy.mode;$('room-enemy-march').value=String(enemy.march);$('room-enemy-prepare').value=String(enemy.prepare);}
      else $('room-enemy-name').value='';
      renderStatus();
    });
    $('room-enemy-mode').addEventListener('change',renderStatus);
    $('room-enemy-form').addEventListener('submit',e=>{
      e.preventDefault();const at=Date.now()+offset;
      try{const enemy=room.enemies.find(x=>x.id===$('room-enemy-select').value),mode=$('room-enemy-mode').value;
        run('record',{id:enemy?.id||'',revision:enemy?.revision||0,name:$('room-enemy-name').value.trim(),mode,prepare:mode==='marching'?0:K.parseDuration($('room-enemy-prepare').value),march:K.parseDuration($('room-enemy-march').value,false),at});
      }catch{error('roomInvalid');}
    });
    $('room-leave').addEventListener('click',()=>{if(role()==='owner'&&!confirm(t('roomCloseConfirm')))return;run(role()==='owner'?'close':'leave');});
    $('room-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(room.code);$('room-copy').textContent=t('roomCopied');}catch{$('room-code-input').value=room.code;$('room-code-input').select();}});
    $('language-select').addEventListener('change',()=>{renderMembers();renderStatus();});
    B.setAction((action,data)=>run(action,data));
    setInterval(async()=>{
      if(document.hidden||!session)return;
      try{if(Date.now()-verifiedAt>=240000){if(!await verify())return;}if(room)await refresh();}catch(err){await handleError(err);}
    },30000);
    window.addEventListener('offline',()=>online(false));
    window.addEventListener('online',()=>{if(room)refresh();});
    window.addEventListener('kingshot:room-resync',()=>{bestRtt=Infinity;online(false);refresh();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&room)refresh();});
    renderStatus();
  }
  init();
})();
