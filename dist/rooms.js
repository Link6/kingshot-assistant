(function(){
  'use strict';
  const $=id=>document.getElementById(id),I=window.KingshotI18n,K=window.KingshotTiming,B=window.KingshotRoomBridge;
  const UI=window.KingshotBattleUI,t=(k,p)=>I.t(k,p),cfg=window.KingshotRoomConfig,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const scope=new URL('.',location.href).pathname,storageKey=`kingshot:${scope}:room`,providerKey=storageKey+':discord';
  let client,session=null,allowed=false,room=null,channel=null,busy=false,connected=false,realtimeReady=false,offset=0,bestRtt=Infinity,uncertainty=0,reading=false,refreshTimer,verifiedAt=0,leaderEdit=null,defenseWindows=[],enemyRecords=[],roomEpoch=0,personalPet=null;
  const role=()=>room?.members.find(m=>m.id===room.me)?.role;
  const roleText=r=>t(r==='owner'?'roomOwner':r==='commander'?'roomCommander':'roomMember');
  function error(key){$('room-error').hidden=!key;$('room-error').textContent=key?t(key):'';}
  function online(flag){connected=!!flag&&realtimeReady;renderStatus();tick();}
  const me=()=>room?.members.find(m=>m.id===room.me);
  const canCommand=()=>['owner','commander'].includes(role());
  const checked=m=>!!m?.march&&m.marchUpdatedAt>=room.battle.marchCheckAt;
  const modeKey=mode=>mode==='attack'?'battleAttackMode':mode==='defend'?'battleDefend':'battleHold';
  const allEnemies=()=>[...room.enemies,...(room.stoppedEnemies||[])];
  const petKey=()=>storageKey+':pet:'+room.me;
  function savePersonalPet(){try{if(personalPet)localStorage.setItem(petKey(),JSON.stringify(personalPet));else localStorage.removeItem(petKey());$('room-pet-error').hidden=true;}catch{$('room-pet-error').textContent=t('storageUnavailable');$('room-pet-error').hidden=false;}}
  function loadPersonalPet(){
    personalPet=null;try{personalPet=K.restorePetEstimate(JSON.parse(localStorage.getItem(petKey())||'null'));}catch{}
    $('room-pet-elapsed').value=personalPet?String(Math.round(Math.min(120,Math.max(0,(Date.now()-personalPet.startedAt)/60000))*10)/10):'0';
    $('room-pet-error').hidden=true;
  }
  function tickPersonalPet(){
    if(!room)return;
    const time=Date.now(),timing=K.petTiming(personalPet,time),review=K.petMarchReview(personalPet,me()?.marchUpdatedAt==null?NaN:me().marchUpdatedAt-offset,time);
    $('room-pet-live').hidden=!timing;$('room-pet-clear').hidden=!timing;
    $('room-own-pet').classList.toggle('warning',!!timing?.needsReview);
    $('room-pet-save').textContent=t(timing?'roomPetUpdate':'roomPetStart');
    if(timing){
      $('room-pet-countdown').textContent=timing.stage==='uncertain'?'—':UI.countdown(Math.ceil(timing.remaining)).split('.')[0];
      $('room-pet-end').textContent=t('petEndAt',{time:K.formatUtc(timing.end,false)});
      $('room-pet-warning').hidden=!timing.needsReview;
      $('room-pet-warning').textContent=timing.needsReview?t(timing.stage==='uncertain'?'petUncertain':timing.stage==='expired'?'roomPetExpired':'roomPetSoon'):'';
      if(timing.needsReview&&timing.stage!=='uncertain'&&!personalPet.alerted){personalPet.alerted=true;savePersonalPet();if(time>=timing.warnAt&&time-timing.warnAt<5000)B.cue('personal-pet:'+room.me+':'+personalPet.startedAt,time,time,time+1200);}
    }
    $('room-march-status').textContent=t(!checked(me())?'marchNeedsCheck':review?'roomPetMarchReview':'marchChecked');
    $('room-march-status').classList.toggle('needs-check',!checked(me())||review);
  }
  function renderStatus(){
    $('room-summary').textContent=t(allowed?'roomVerified':'roomSolo');
    $('room-account').textContent=t(allowed?'roomVerified':session?'roomVerify':'roomNeedLogin');
    $('room-login').hidden=!!session&&allowed;$('room-logout').hidden=!session;
    $('room-entry').hidden=!allowed||!!room;
    for(const id of ['room-login','room-create','room-join'])$(id).disabled=busy||id!=='room-login'&&!allowed;
    if(!room)return;
    $('room-reauth').hidden=allowed;$('room-reauth').disabled=busy;
    $('room-code').textContent=room.code;$('room-leave').textContent=t(role()==='owner'?'roomClose':'roomLeave');
    $('room-sync').textContent=connected?t('roomConnected',{role:roleText(role()),ms:Math.ceil(uncertainty),expiry:new Date(room.expiresAt).toLocaleTimeString(I.language)})+(uncertainty>500?' · '+t('roomClockWarning'):''):t('roomOffline');
    $('room-sync').classList.toggle('disconnected',!connected);
    $('room-battle-mode').textContent=t(modeKey(room.battle.mode));
    $('room-my-role').textContent=t(room.leaders.some(l=>l.userId===room.me)?'roomLeaderBadge':'roomJoinerBadge');
    tickPersonalPet();
    $('room-announcement').hidden=!room.battle.note;$('room-announcement').textContent=room.battle.note;
    $('room-command').hidden=!canCommand();
    $('room-attack').hidden=room.battle.mode==='defend';$('room-defense').hidden=room.battle.mode!=='defend';
    for(const id of ['room-publish-form','room-leader-manager','room-leader-form','room-enemy-editor','room-enemy-form'])$(id).hidden=!canCommand();
    for(const id of ['room-command','room-publish-form','room-leader-form','room-enemy-form'])$(id).querySelectorAll('input,select,button').forEach(el=>el.disabled=!allowed||!connected||busy||!canCommand());
    for(const id of ['room-orders','room-defense-rows','room-leaders','room-members'])$(id).querySelectorAll('input,select,button').forEach(el=>el.disabled=busy||!allowed||!connected||!canCommand());
    if($('room-leader-source').value){$('room-leader-name').disabled=true;$('room-leader-march').disabled=true;}
    $('room-enemy-prepare').disabled=!allowed||!connected||busy||!canCommand()||$('room-enemy-mode').value==='marching';
    $('room-save-self').disabled=busy||!allowed||!connected;
    document.querySelectorAll('[data-battle-mode]').forEach(el=>el.classList.toggle('selected',el.dataset.battleMode===room.battle.mode));
  }
  function renderMembers(){
    if(!room)return;
    $('room-members').innerHTML=room.members.map(m=>`<div class="room-member"><div><b>${esc(m.name)}</b><small>${t(room.leaders.some(l=>l.userId===m.id)?'roomLeaderBadge':'roomJoinerBadge')} · ${m.march==null?'—':esc(m.march+' '+t('seconds'))}</small><small class="${checked(m)?'':'needs-check'}">${t(checked(m)?'marchChecked':'marchNeedsCheck')}</small></div>${role()==='owner'&&m.role!=='owner'?`<select data-room-role="${esc(m.id)}" aria-label="${esc(m.name+' '+t('roomRoleHint'))}"><option value="member" ${m.role==='member'?'selected':''}>${t('roomMember')}</option><option value="commander" ${m.role==='commander'?'selected':''}>${t('roomCommander')}</option></select>`:`<span class="pill neutral">${roleText(m.role)}</span>`}</div>`).join('');
    renderLeaders();
    const selected=$('room-enemy-select').value;
    $('room-enemy-select').innerHTML=`<option value="">${t('roomNewEnemy')}</option>`+allEnemies().map(e=>`<option value="${esc(e.id)}">${esc(e.name)}${e.active===false?' · '+t('enemyStopped'):''}</option>`).join('');
    if(allEnemies().some(e=>e.id===selected))$('room-enemy-select').value=selected;
    renderBattle();renderStatus();
  }
  function planStale(){return !!room?.plan&&(room.plan.rows.length!==room.leaders.length||room.plan.rows.some(r=>!room.leaders.some(l=>l.id===r.id&&l.userId===r.userId&&l.prepare===r.prepareSeconds&&l.march===r.marchSeconds)));}
  function renderBattle(){
    const rows=room.plan?.rows||[],opened=[...$('room-orders').querySelectorAll('details[open]')].map(el=>el.closest('[data-order-id]').dataset.orderId);
    const focused=document.activeElement?.matches('[data-rally-at]')?{id:document.activeElement.closest('[data-order-id]').dataset.orderId,value:document.activeElement.value}:null;
    $('room-orders').innerHTML=rows.length?UI.orders(rows,canCommand()):`<div class="result-placeholder">${t('waitPublishedPlan')}</div>`;
    for(const id of opened)$('room-orders').querySelector(`[data-order-id="${CSS.escape(id)}"] details`)?.setAttribute('open','');
    if(focused){const input=$('room-orders').querySelector(`[data-order-id="${CSS.escape(focused.id)}"] [data-rally-at]`);if(input){input.value=focused.value;input.focus({preventScroll:true});}}
    $('room-plan-target').textContent=room.plan?t('sharedArrivalTarget',{time:K.formatUtc(room.plan.target)}):'';
    $('room-plan-stale').hidden=!planStale();
    $('room-attack-gaps').innerHTML=UI.gaps(rows,room.battle.margin);
    $('room-gap-hint').textContent=t('gapMarginHint',{margin:room.battle.margin});
    enemyRecords=room.enemies.filter(e=>e.active!==false).map(e=>({...e,marchSeconds:e.march}));
    defenseWindows=me()?.march?K.guardWindows(enemyRecords,me().march,room.battle.margin):[];
    $('room-defense-windows').innerHTML=defenseWindows.length?defenseWindows.map(w=>`<div class="rally-gap ${w.usable?'has-gap':''}"><div><b>${esc(w.before.name)} → ${esc(w.after.name)}</b><small>${t('safeWindow')}: ${w.usable?esc(w.width+' '+t('seconds')):t('noSafeWindow')}</small></div><div>${w.usable?esc(K.formatUtc(w.start))+'<small>'+esc(K.formatUtc(w.end))+'</small>':t('noInsertionWindow')}</div></div>`).join(''):`<p class="result-placeholder">${t(me()?.march?'twoNeeded':'marchNeedsCheck')}</p>`;
    $('room-defense-rows').innerHTML=allEnemies().map(renderEnemyCard).join('');
    tick();
  }
  function renderEnemyCard(r){
    const stopped=r.active===false,actions=canCommand()?`<div class="room-leader-actions"><button class="text-button" ${stopped?'data-enemy-rerecord':'data-enemy-stop'}>${t(stopped?'enemyRecordAgain':'enemyStop')}</button><button class="text-button subtle" data-enemy-delete>${t('delete')}</button></div>`:'';
    const controls=field=>canCommand()?`<div class="time-nudges" role="group" aria-label="${esc(t(field==='prepare'?'prepareAdjust':'marchAdjust'))}">${[-1,-0.1,0.1,1].map(d=>`<button data-enemy-field="${field}" data-delta="${d}">${d>0?'+':'−'}${Math.abs(d)}s</button>`).join('')}</div>`:'';
    const clock=stopped?`<p class="field-note">${t('enemyStopHint')}</p>`:`<div class="enemy-comparison"><section class="enemy-comparison-clock" data-enemy-prepare-block ${r.mode==='marching'?'hidden':''}><span>${t('prepareMinuteSecond')}</span><strong data-enemy-prepare></strong>${controls('prepare')}</section><section class="enemy-comparison-clock"><span data-enemy-march-label></span><strong data-enemy-march></strong>${controls('march')}</section></div><div class="enemy-arrival-reading"><span>${t('enemyArrivalIn')}</span><strong data-enemy-time></strong><small>${K.formatUtc(r.arrivalAt)}</small></div>`;
    return `<article class="rally-order ${stopped?'enemy-stopped':''}" data-enemy-id="${esc(r.id)}"><header><b>${esc(r.name)}</b><span class="pill neutral" ${stopped?'':'data-enemy-stage'}>${stopped?t('enemyStopped'):''}</span>${actions}</header>${clock}</article>`;
  }
  function editEnemy(enemy,restart=false){
    $('room-enemy-select').value=enemy.id;$('room-enemy-name').value=enemy.name;
    $('room-enemy-mode').value=restart?'gathering':enemy.mode;$('room-enemy-march').value=String(enemy.march);
    $('room-enemy-prepare').value=K.formatMinutesSeconds(restart&&!enemy.prepare?300:enemy.prepare);
    $('room-enemy-editor').open=true;renderStatus();
  }
  function showOrder(title,value,instruction,range='',go=false){
    for(const [id,text] of [['room-order-title',title],['room-order-countdown',value],['room-order-instruction',instruction],['room-order-range',range]])if($(id).textContent!==text)$(id).textContent=text;
    $('room-order-countdown').classList.toggle('textual',/[^\d:.-]/.test(value));$('room-order').classList.toggle('go',go);
  }
  function tick(){
    if(!room||document.hidden)return;
    tickPersonalPet();
    const time=Date.now()+offset,rows=room.plan?.rows||[];$('room-order').classList.remove('narrow-window');
    UI.tick($('room-orders'),rows,time);
    for(const r of enemyRecords){
      const card=$('room-defense-rows').querySelector(`[data-enemy-id="${CSS.escape(r.id)}"]`);if(!card)continue;
      const live=K.enemyCountdown(r,time);
      card.querySelector('[data-enemy-stage]').textContent=t(live.stage==='arrived'?'attackPassed':live.stage);
      card.querySelector('[data-enemy-prepare]').textContent=K.formatMinutesSeconds(Math.ceil(live.prepare*10)/10);
      card.querySelector('[data-enemy-march-label]').textContent=t(live.stage==='gathering'?'marchFull':'marchRemaining');
      card.querySelector('[data-enemy-march]').textContent=I.number(Math.ceil(live.march*10)/10)+' '+t('seconds');
      card.querySelector('[data-enemy-time]').textContent=UI.countdown((r.arrivalAt-time)/1000);
      card.querySelectorAll('[data-enemy-field="prepare"]').forEach(b=>b.disabled=!connected||busy||live.stage!=='gathering');
    }
    if(!connected){showOrder(t('roomOfflineShort'),'—',t('roomOffline'));return;}
    if(room.battle.mode==='hold'){showOrder(t('battleHold'),'—',t('waitCommander'));return;}
    if(!checked(me())){showOrder(t('checkMarchFirst'),'—',t('marchNeedsCheck'));return;}
    if(room.battle.mode==='defend'){
      const w=K.nextWindow(defenseWindows,time);
      if(!w){showOrder(t(enemyRecords.length<2?'waitingEnemy':'noWindow'),'—',t(enemyRecords.length<2?'twoNeeded':defenseWindows.some(w=>w.usable)?'missedHint':'gapShortHint'));return;}
      const go=time>=w.midpoint,remaining=(w.midpoint-time)/1000;
      $('room-order').classList.toggle('narrow-window',w.narrow);
      showOrder(t(go?'sendNow':'waitingSend'),go?t('sendNow'):UI.countdown(remaining),t('between',{before:w.before.name,after:w.after.name})+(w.narrow?' · '+t('hospitalWarning'):''),K.formatUtc(w.start)+' – '+K.formatUtc(w.end).slice(11),go);
      B.cue('defense:'+w.id+':'+w.midpoint,w.midpoint,time,w.end);return;
    }
    if(!rows.length||planStale()){showOrder(t('waitPublishedPlan'),'—',t(planStale()?'sharedPlanStale':'waitCommander'));return;}
    const own=rows.find(r=>r.userId===room.me);
    if(own){
      const timing=K.rallyTiming(own,time),key=timing.stage==='waiting'?'launchCountdown':timing.stage==='launch'?'launchNow':timing.stage==='gathering'?'prepareRemaining':timing.stage==='marching'?'marchRemaining':'arrived';
      showOrder(t(key),timing.stage==='launch'?t('launch'):timing.stage==='arrived'?'—':UI.countdown(timing.remaining),t('leaderActionHint'),K.formatUtc(own.launchAt),timing.stage==='launch');
      if(!own.confirmed)B.cue('launch:'+room.plan.id+':'+own.id+':'+own.launchAt,own.launchAt,time,own.launchAt+1200);
    }else{
      const gathering=rows.filter(r=>time>=r.launchAt&&time<r.launchAt+r.prepareSeconds*1000),next=rows.find(r=>r.launchAt>time);
      if(gathering.length)showOrder(t('joinRallyNow'),UI.countdown((Math.min(...gathering.map(r=>r.launchAt+r.prepareSeconds*1000))-time)/1000),t('joinRallyHint',{names:gathering.map(r=>r.name).join(' / ')}));
      else showOrder(t(next?'prepareToJoin':'battleHold'),next?UI.countdown((next.launchAt-time)/1000):'—',t('followCommander'));
    }
  }
  function leaderSource(){
    const member=room?.members.find(m=>m.id===$('room-leader-source').value);
    if(member){$('room-leader-name').value=member.name;$('room-leader-march').value=member.march==null?'':String(member.march);}
    $('room-leader-march-hint').hidden=!member;renderStatus();
  }
  function renderLeaders(){
    const canEdit=role()!=='member';
    $('room-leaders').innerHTML=room.leaders.length?room.leaders.map(l=>`<div class="room-member"><div><b>${esc(l.name)}</b><small>${l.march==null?t('roomLeaderWaiting'):esc(t('roomLeaderTimes',{prepare:l.prepare,march:l.march}))}</small></div>${canEdit?`<div class="room-leader-actions"><button type="button" class="text-button" data-leader-edit="${esc(l.id)}">${t('roomLeaderEdit')}</button><button type="button" class="text-button subtle" data-leader-remove="${esc(l.id)}">${t('roomLeaderRemove')}</button></div>`:''}</div>`).join(''):`<p class="field-note">${t('roomLeaderEmpty')}</p>`;
    const selected=$('room-leader-source').value;
    $('room-leader-source').innerHTML=`<option value="">${t('roomLeaderManual')}</option>`+room.members.filter(m=>!room.leaders.some(l=>l.userId===m.id&&l.id!==leaderEdit?.id)).map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');
    if([...$('room-leader-source').options].some(o=>o.value===selected))$('room-leader-source').value=selected;
    $('room-leader-save').textContent=t(leaderEdit?'roomLeaderSave':'roomLeaderAdd');$('room-leader-cancel').hidden=!leaderEdit;
    leaderSource();
  }
  function resetLeader(){
    leaderEdit=null;$('room-leader-form').reset();if(room)renderLeaders();
  }
  function editLeader(id){
    const l=room?.leaders.find(l=>l.id===id);if(!l){resetLeader();return;}
    leaderEdit={id:l.id,revision:l.revision};renderLeaders();
    $('room-leader-source').value=l.userId||'';$('room-leader-name').value=l.name;
    $('room-leader-prepare').value=String(l.prepare);$('room-leader-march').value=l.march==null?'':String(l.march);
    leaderSource();
  }
  function saveCode(code){try{if(code)localStorage.setItem(storageKey,code);else localStorage.removeItem(storageKey);}catch{}}
  async function clearRoom(remember=false){roomEpoch++;if(channel){await client.removeChannel(channel);channel=null;}room=null;leaderEdit=null;connected=false;realtimeReady=false;reading=false;if(!remember)saveCode('');B.clear();renderStatus();}
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
    const first=!room,previous=room,changed=first||snapshot.revision!==room.revision;room=snapshot;room.leaders=room.leaders||[];room.battle=room.battle||{mode:'hold',note:'',margin:0.2,marchCheckAt:Infinity};
    if(first){leaderEdit=null;$('room-leader-form').reset();const me=room.members.find(m=>m.id===room.me);$('room-march').value=me.march==null?'':String(me.march);loadPersonalPet();}
    if(first||previous.battle.note!==room.battle.note)$('room-command-note').value=room.battle.note;
    if(first||previous.battle.margin!==room.battle.margin)$('room-command-margin').value=String(room.battle.margin);
    B.setActive(true);saveCode(room.code);if(changed)renderMembers();online(true);
  }
  async function handleError(err){
    const msg=String(err?.message||err);
    if(msg.includes('KS_VERIFY')||msg.includes('KS_LOGIN')){allowed=false;online(false);error('roomReauth');}
    else if(/KS_(FULL|MEMBERS|ENEMIES|LEADERS|QUOTA|RATE)/.test(msg))error('roomQuota');
    else if(msg.includes('KS_MARCH_CHECK'))error('leadersNeedMarchCheck');
    else if(msg.includes('KS_NO_LEADERS'))error('noLeaders');
    else if(msg.includes('KS_LEADER'))error('roomLeaderDuplicate');
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
    reading=true;const epoch=roomEpoch;
    try{const result=await rpc('read',room.code);if(epoch===roomEpoch)apply(result);}catch(err){if(epoch===roomEpoch)await handleError(err);}finally{reading=false;}
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
    if(busy||!allowed||room&&!connected&&!['read','leave','close'].includes(action))return;
    busy=true;error('');renderStatus();const epoch=roomEpoch;
    try{
      const result=await rpc(action,code,data);
      if(epoch!==roomEpoch)return;
      if(result.left)await clearRoom();
      else{const first=!room;const recorded=action==='record'?result.enemies.find(e=>data.id?e.id===data.id:e.name===data.name&&Math.abs(e.recordedAt-data.at)<1):null;apply(result);if(action==='leader')resetLeader();if(recorded)$('room-enemy-select').value=recorded.id;if(first)await subscribe();}
    }catch(err){if(epoch!==roomEpoch)return;await handleError(err);if(action==='leader'&&String(err?.message).includes('KS_CONFLICT'))editLeader(data.id);}finally{busy=false;renderStatus();}
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
    $('room-reauth').addEventListener('click',()=>$('room-login').click());
    $('room-create').addEventListener('click',()=>run('create',{name:$('room-name').value.trim()}));
    $('room-join').addEventListener('click',()=>run('join',{name:$('room-name').value.trim()},$('room-code-input').value.trim().toUpperCase()));
    $('room-save-self').addEventListener('click',()=>{try{run('member',{march:K.parseDuration($('room-march').value,false)});}catch{error('roomInvalid');}});
    $('room-pet-save').addEventListener('click',()=>{if(!room)return;try{personalPet=K.makePetEstimate($('room-pet-elapsed').value,Date.now());savePersonalPet();tickPersonalPet();}catch{$('room-pet-error').textContent=t('petElapsedInvalid');$('room-pet-error').hidden=false;}});
    $('room-pet-clear').addEventListener('click',()=>{if(!room)return;personalPet=null;savePersonalPet();tickPersonalPet();});
    $('room-members').addEventListener('change',e=>{if(e.target.dataset.roomRole)run('role',{userId:e.target.dataset.roomRole,role:e.target.value});});
    $('room-leader-source').addEventListener('change',()=>{if(!$('room-leader-source').value){$('room-leader-name').value='';$('room-leader-march').value='';}leaderSource();});
    $('room-leader-cancel').addEventListener('click',resetLeader);
    $('room-leaders').addEventListener('click',e=>{
      const edit=e.target.closest('[data-leader-edit]'),remove=e.target.closest('[data-leader-remove]');
      if(edit)editLeader(edit.dataset.leaderEdit);
      if(remove){const l=room.leaders.find(l=>l.id===remove.dataset.leaderRemove);if(l)run('leader',{op:'delete',id:l.id,revision:l.revision});}
    });
    $('room-leader-form').addEventListener('submit',e=>{
      e.preventDefault();
      try{const userId=$('room-leader-source').value;
        run('leader',{op:'save',id:leaderEdit?.id||'',revision:leaderEdit?.revision||0,userId,name:$('room-leader-name').value.trim(),prepare:K.parseDuration($('room-leader-prepare').value),march:userId?null:K.parseDuration($('room-leader-march').value,false)});
      }catch{error('roomInvalid');}
    });
    $('room-enemy-select').addEventListener('change',()=>{
      const enemy=allEnemies().find(e=>e.id===$('room-enemy-select').value);
      if(enemy)editEnemy(enemy,enemy.active===false);
      else $('room-enemy-name').value='';
      renderStatus();
    });
    $('room-enemy-mode').addEventListener('change',renderStatus);
    $('room-enemy-prepare').addEventListener('blur',()=>{try{$('room-enemy-prepare').value=K.formatMinutesSeconds(K.parseDuration($('room-enemy-prepare').value));}catch{}});
    $('room-enemy-form').addEventListener('submit',e=>{
      e.preventDefault();const at=Date.now()+offset;
      try{const enemy=allEnemies().find(x=>x.id===$('room-enemy-select').value),mode=$('room-enemy-mode').value;
        run('record',{id:enemy?.id||'',revision:enemy?.revision||0,name:$('room-enemy-name').value.trim(),mode,prepare:mode==='marching'?0:K.parseDuration($('room-enemy-prepare').value),march:K.parseDuration($('room-enemy-march').value,false),at});
      }catch{error('roomInvalid');}
    });
    $('room-leave').addEventListener('click',()=>{if(!connected){clearRoom();return;}if(role()==='owner'&&!confirm(t('roomCloseConfirm')))return;run(role()==='owner'?'close':'leave');});
    $('room-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(room.code);$('room-copy').textContent=t('roomCopied');}catch{const selection=getSelection(),range=document.createRange();range.selectNodeContents($('room-code'));selection.removeAllRanges();selection.addRange(range);}});
    $('language-select').addEventListener('change',()=>{renderMembers();renderStatus();tick();});
    const command=(mode=room.battle.mode,check=false)=>{
      try{run('command',{mode,check,note:$('room-command-note').value,margin:K.parseDuration($('room-command-margin').value),revision:room.battle.revision});}catch{error('roomInvalid');}
    };
    document.querySelectorAll('[data-battle-mode]').forEach(b=>b.addEventListener('click',()=>command(b.dataset.battleMode)));
    $('room-command-save').addEventListener('click',()=>command());$('room-check-marches').addEventListener('click',()=>command(room.battle.mode,true));
    $('room-publish-form').addEventListener('submit',e=>{e.preventDefault();try{const value=$('room-plan-target-input').value;run('publish',{revision:room.battle.revision,lead:K.parseDuration($('room-plan-lead').value,false),target:value?new Date(value).getTime():null});}catch{error('roomInvalid');}});
    $('room-orders').addEventListener('click',e=>{
      const b=e.target.closest('[data-rally-delta],[data-rally-now],[data-rally-set]');if(!b)return;const card=b.closest('[data-order-id]'),r=room.plan.rows.find(r=>r.id===card.dataset.orderId);
      const data=b.hasAttribute('data-rally-delta')?{delta:Number(b.dataset.rallyDelta)}:{at:b.hasAttribute('data-rally-now')?Date.now()+offset:new Date(card.querySelector('[data-rally-at]').value).getTime()};
      if(data.at!==undefined&&!Number.isFinite(data.at)){error('roomInvalid');return;}
      run('rally_adjust',{...data,id:r.id,revision:r.revision,planId:room.plan.id});
    });
    $('room-defense-rows').addEventListener('click',e=>{
      const b=e.target.closest('[data-enemy-delete],[data-enemy-field],[data-enemy-stop],[data-enemy-rerecord]');if(!b)return;const r=allEnemies().find(r=>r.id===b.closest('[data-enemy-id]').dataset.enemyId);
      if(b.hasAttribute('data-enemy-stop')){run('stop_enemy',{id:r.id,revision:r.revision});return;}
      if(b.hasAttribute('data-enemy-rerecord')){editEnemy(r,true);$('room-enemy-editor').scrollIntoView({block:'nearest'});$('room-enemy-prepare').focus({preventScroll:true});return;}
      if(b.hasAttribute('data-enemy-delete')){if(confirm(t('deleteConfirm')))run('delete',{id:r.id,revision:r.revision});}
      else run('adjust',{id:r.id,revision:r.revision,field:b.dataset.enemyField,delta:Number(b.dataset.delta)});
    });
    setInterval(tick,100);
    setInterval(async()=>{
      if(document.hidden||!session)return;
      try{if(Date.now()-verifiedAt>=240000){if(!await verify())return;}if(room)await refresh();}catch(err){await handleError(err);}
    },30000);
    window.addEventListener('offline',()=>online(false));
    window.addEventListener('online',()=>{if(room)refresh();});
    window.addEventListener('kingshot:room-resync',e=>{if(e.detail?.clockChanged&&room&&personalPet){personalPet.clockChanged=true;savePersonalPet();}bestRtt=Infinity;online(false);refresh();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&room)refresh();});
    renderStatus();
  }
  init();
})();
