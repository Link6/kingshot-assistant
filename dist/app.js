(function () {
  'use strict';
  const K=window.KingshotTiming, I=window.KingshotI18n, t=(key,params)=>I.t(key,params), $=id=>document.getElementById(id);
  const desktop=window.kingshotDesktop;
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>crypto.randomUUID?.() || `r${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const scope=new URL('.',location.href).pathname;
  const STORAGE=`kingshot:${scope}:drafts:v2`, LANGUAGE=`kingshot:${scope}:language`;
  const state={tab:'rally',sound:true,focus:false,pinned:false,schedule:'auto',lead:'10',target:'',rally:[],guard:[],own:'29',margin:'0.2'};
  let plan=null, windows=[], validOwn='29', validMargin='0.2', audio=null, toastTimer, storageWarning=false, settingsValid=true, sessionInvalid=false;
  let previousWall=Date.now(),previousMono=performance.now();
  const records=new Map(), errors=new Map(), fired=new Set();
  let battleNodes={attacks:[],windows:[]};
  let battleFrame=0,battleTrackWidth=0;
  const now=()=>Date.now();
  function txt(id,value){const el=$(id);if(el&&el.textContent!==String(value))el.textContent=value;}
  function toast(key,params){txt('toast',t(key,params));$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3600);}
  function errorText(err){return err.code==='rowError'?t('rowError',{name:err.params.name||t('leaderName',{n:err.params.index+1}),reason:t(err.params.reason)}):t(err.code||'invalidTime');}
  function showError(id,err,suffix){if(err)errors.set(id,{err,suffix});else errors.delete(id);const el=$(id);if(el){el.hidden=!err;el.textContent=err?errorText(err)+(suffix?' '+t(suffix):''):'';}}
  function clock(time,decimals=false){const d=new Date(time);return [d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,'0')).join(':')+(decimals?'.'+Math.floor(d.getMilliseconds()/100):'');}
  function countdown(seconds){const ticks=Math.ceil(Math.max(0,seconds)*10),total=Math.floor(ticks/10),h=Math.floor(total/3600);return(h?`${h}:`:'')+`${String(Math.floor(total/60)%60).padStart(2,'0')}:${String(total%60).padStart(2,'0')}.${ticks%10}`;}
  function duration(seconds){return seconds<60?t('durationS',{s:I.number(seconds)}):t('durationMS',{m:Math.floor(seconds/60),s:I.number(seconds%60)});}
  const rowName=(r,kind='rally')=>r.name||t(kind==='rally'?'leaderName':'enemyName',{n:(r.index??state[kind].findIndex(x=>x.id===r.id))+1});
  const fresh=(kind,name='')=>({id:uid(),name,prepare:'5:00',march:'',pet:null,petElapsed:'0',...(kind==='guard'?{mode:'gathering'}:{})});
  function restore(){
    let preferred=navigator.language;
    try{
      preferred=localStorage.getItem(LANGUAGE)||preferred;
      const saved=JSON.parse(localStorage.getItem(STORAGE)||(scope==='/'?localStorage.getItem('kingshot-timing-drafts-v1'):null));
      if(saved&&typeof saved==='object'){
        for(const key of ['lead','own','margin'])if(typeof saved[key]==='string')state[key]=saved[key];
        if(typeof saved.sound==='boolean')state.sound=saved.sound;
        for(const kind of ['rally','guard'])if(Array.isArray(saved[kind]))state[kind]=saved[kind].slice(0,30).filter(r=>r&&typeof r==='object').map(r=>({...fresh(kind),name:String(r.name||'').slice(0,40),prepare:String(r.prepare??'5:00'),march:String(r.march??''),pet:K.restorePetEstimate(r.pet),petElapsed:String(r.petElapsed??'0'),...(kind==='guard'?{mode:r.mode==='marching'?'marching':'gathering'}:{})}));
        try{K.parseDuration(state.own,false);validOwn=state.own;}catch{state.own=validOwn;}
        try{K.parseDuration(state.margin);validMargin=state.margin;}catch{state.margin=validMargin;}
      }
    }catch{}
    I.setLanguage(preferred);
  }
  function save(){try{const {lead,own,margin,sound,rally,guard}=state;localStorage.setItem(STORAGE,JSON.stringify({lead,own,margin,sound,rally,guard}));localStorage.setItem(LANGUAGE,I.language);}catch{if(!storageWarning){storageWarning=true;toast('storageUnavailable');}}}
  function showResult(kind){const el=$(`${kind}-hero`),b=el.getBoundingClientRect();if(b.top<68||b.bottom>innerHeight)el.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  function dirtyPlan(){if(plan)$('rally-dirty').hidden=false;}
  function renderPetControls(r,kind){return `<section class="pet-timer" id="pet-panel-${r.id}"><div class="pet-heading"><b>${t(kind==='rally'?'rallyPetTitle':'petTitle')}</b><span id="pet-status-${r.id}"></span></div><div class="pet-controls"><label>${t('petElapsed')}<input data-pet-elapsed type="number" min="0" max="120" step="any" inputmode="decimal" value="${esc(r.petElapsed)}"></label><button class="button secondary" data-pet-start>${t(r.pet?'petApply':'petStart')}</button></div><p class="pet-help">${t('petHelp')}</p><div class="form-error" id="pet-error-${r.id}" role="alert" hidden></div><div id="pet-live-${r.id}" hidden><div class="pet-reading"><span>${t('petRemaining')}</span><strong id="pet-time-${r.id}"></strong><button class="text-button subtle" data-pet-stop>${t('petStop')}</button></div><p id="pet-end-${r.id}"></p><p class="pet-warning" id="pet-warning-${r.id}" hidden></p></div></section>`;}
  function renderRallyRows(){
    txt('rally-count',state.rally.length);$('rally-empty').hidden=!!state.rally.length;$('add-rally').disabled=state.rally.length>=30;
    $('rally-rows').innerHTML=state.rally.map((r,i)=>`<div class="person-row" data-id="${r.id}"><div class="row-title"><span class="row-number">${String(i+1).padStart(2,'0')}</span><input data-field="name" aria-label="${esc(t('leaderName',{n:i+1})+' '+t('name'))}" placeholder="${esc(t('leaderPlaceholder'))}" value="${esc(r.name)}" maxlength="40"><button class="delete-row" data-delete aria-label="${esc(t('deleteLeader',{n:i+1}))}">×</button></div><div class="field-grid"><label>${t('prepare')}<span class="input-unit"><input data-field="prepare" value="${esc(r.prepare)}" placeholder="5:00"><span>${t('time')}</span></span></label><label>${t('march')}<span class="input-unit"><input data-field="march" value="${esc(r.march)}" placeholder="${t('example35')}"><span>${t('seconds')}</span></span></label></div><div class="row-hint" id="rally-hint-${r.id}"></div>${renderPetControls(r,'rally')}</div>`).join('');
    state.rally.forEach(updateRallyHint);
    updatePets(now());
    for(const [id,{err,suffix}] of errors)if(id.startsWith('pet-error-'))showError(id,err,suffix);
  }
  function updateRallyHint(r){try{txt(`rally-hint-${r.id}`,t('total',{time:duration(K.parseDuration(r.prepare)+K.parseDuration(r.march,false))}));}catch{txt(`rally-hint-${r.id}`,t('totalHint'));}}
  function updatePets(time){
    let changed=false;
    for(const kind of ['rally','guard']){
    const warnings=[];
    for(const r of state[kind]){
      const timing=K.petTiming(r.pet,time),panel=$(`pet-panel-${r.id}`);
      if(panel){
        panel.classList.toggle('warning',!!timing?.needsReview);
        $(`pet-live-${r.id}`).hidden=!timing;
        txt(`pet-status-${r.id}`,timing?t('petActive'):'');
        if(timing){
          txt(`pet-time-${r.id}`,timing.stage==='uncertain'?'—':countdown(Math.ceil(timing.remaining)).split('.')[0]);
          txt(`pet-end-${r.id}`,t('petEndAt',{time:K.formatUtc(timing.end,false)}));
          $(`pet-warning-${r.id}`).hidden=!timing.needsReview;
          txt(`pet-warning-${r.id}`,timing.needsReview?t(timing.stage==='uncertain'?'petUncertain':timing.stage==='expired'?'petExpired':'petSoon'):'');
        }
      }
      if(!timing?.needsReview)continue;
      warnings.push(rowName(r,kind));
      if(timing.stage==='uncertain'&&!r.pet.clockChanged){r.pet.clockChanged=true;changed=true;}
      if(!r.pet.alerted){r.pet.alerted=true;changed=true;beep(false);}
    }
    const prefix=kind==='rally'?'rally-pet':'pet';
    $(`${prefix}-reminders`).hidden=!warnings.length;
    txt(`${prefix}-reminder-text`,warnings.length?t(kind==='rally'?'rallyPetReminder':'petReminder',{names:warnings.join(' / ')}):'');
    }
    if(changed)save();
  }
  const battleDraft=r=>JSON.stringify({name:r.name,mode:r.mode,prepare:r.prepare,march:r.march});
  function renderGuardRows(){
    txt('guard-count',state.guard.length);$('guard-empty').hidden=!!state.guard.length;$('add-guard').disabled=state.guard.length>=30;
    $('guard-rows').innerHTML=state.guard.map((r,i)=>`<div class="person-row guard-row" data-id="${r.id}"><div class="row-title"><span class="row-number">${String(i+1).padStart(2,'0')}</span><input data-field="name" aria-label="${esc(t('enemyName',{n:i+1})+' '+t('name'))}" placeholder="${t('enemyPlaceholder')}" value="${esc(r.name)}" maxlength="40"><button class="delete-row" data-delete aria-label="${esc(t('deleteEnemy',{n:i+1}))}">×</button></div><div class="row-toolbar"><div class="mode-toggle" role="group" aria-label="${t('stage')}"><button data-mode="gathering" class="${r.mode==='gathering'?'selected':''}" aria-pressed="${r.mode==='gathering'}">${t('gathering')}</button><button data-mode="marching" class="${r.mode==='marching'?'selected':''}" aria-pressed="${r.mode==='marching'}">${t('marching')}</button></div><span class="record-status" id="record-status-${r.id}"></span></div><div class="field-grid ${r.mode==='marching'?'marching':''}">${r.mode==='gathering'?`<label>${t('prepareRemaining')}<span class="input-unit"><input data-field="prepare" value="${esc(r.prepare)}" placeholder="${t('example440')}"><span>${t('time')}</span></span></label>`:''}<label>${t(r.mode==='marching'?'marchRemaining':'marchFull')}<span class="input-unit"><input data-field="march" value="${esc(r.march)}" placeholder="${t('example35')}"><span>${t('seconds')}</span></span></label></div><div class="form-error" id="guard-error-${r.id}" role="alert" hidden></div><button class="record-button" data-record><span id="record-label-${r.id}"></span><span>↗</span></button><div class="record-caption" id="record-caption-${r.id}"></div></div>`).join('');
    state.guard.forEach(r=>{
      const controls=field=>[-1,-0.1,0.1,1].map(delta=>`<button type="button" data-adjust="${field}" data-delta="${delta}" aria-label="${esc(t(field==='prepare'?'adjustPrepare':'adjustMarch',{delta:(delta>0?'+':'')+delta}))}">${delta>0?'+':'−'}${Math.abs(delta)}${t('seconds')}</button>`).join('');
      $(`record-caption-${r.id}`).insertAdjacentHTML('afterend',`<section class="enemy-live" id="enemy-live-${r.id}" aria-label="${t('liveTiming')}" hidden><div class="enemy-live-heading"><b>${t('liveTiming')}</b><span id="enemy-stage-${r.id}"></span></div><div class="enemy-clock" id="enemy-prepare-group-${r.id}"><div><span>${t('prepareRemaining')}</span><strong id="enemy-prepare-${r.id}"></strong></div><div class="time-nudges" role="group" aria-label="${t('prepareAdjust')}">${controls('prepare')}</div></div><div class="enemy-clock"><div><span id="enemy-march-label-${r.id}"></span><strong id="enemy-march-${r.id}"></strong></div><div class="time-nudges" role="group" aria-label="${t('marchAdjust')}">${controls('march')}</div></div><p>${t('adjustHelp')}</p><p id="enemy-adjust-note-${r.id}" role="status"></p></section>`);
      $(`enemy-live-${r.id}`).insertAdjacentHTML('afterend',renderPetControls(r,'guard'));
      updateGuardRow(r);
    });
    updatePets(now());
    for(const [id,{err,suffix}] of errors)if(id.startsWith('guard-error-')||id.startsWith('pet-error-'))showError(id,err,suffix);
  }
  function updateGuardRow(r){
    const rec=records.get(r.id),edited=rec&&rec.draft!==battleDraft(r),status=$(`record-status-${r.id}`);
    status.className=`record-status ${rec?edited?'dirty':'recorded':''}`;status.textContent=t(rec?edited?'edited':'recorded':'unrecorded');
    let reading;try{reading=duration(K.parseDuration(r.mode==='marching'?r.march:r.prepare));}catch{reading=t('reading');}
    txt(`record-label-${r.id}`,t('recordLabel',{action:t(rec?'rerecord':'record'),reading}));
    txt(`record-caption-${r.id}`,rec?t('recordDetails',{recorded:clock(rec.recordedAt,true),arrival:clock(rec.arrivalAt,true),dirty:edited?t('usingPrevious'):''}):t(r.mode==='marching'?'marchHelp':'recordHelp'));
    $(`enemy-live-${r.id}`).hidden=!rec;
    txt(`enemy-adjust-note-${r.id}`,rec?.adjusted?t('adjustApplied',{time:clock(rec.arrivalAt,true)}):'');
    if(rec)updateEnemyClock(rec,now());
  }
  function updateEnemyClock(rec,time){
    const live=K.enemyCountdown(rec,time);
    txt(`enemy-stage-${rec.id}`,t(live.stage==='arrived'?'attackPassed':live.stage));
    $(`enemy-prepare-group-${rec.id}`).hidden=rec.mode==='marching';
    txt(`enemy-prepare-${rec.id}`,countdown(live.prepare));
    txt(`enemy-march-label-${rec.id}`,t(live.stage==='gathering'?'marchFull':'marchRemaining'));
    txt(`enemy-march-${rec.id}`,countdown(live.march));
    $(`enemy-live-${rec.id}`).querySelectorAll('[data-adjust="prepare"]').forEach(button=>button.disabled=live.stage!=='gathering');
  }
  function renderRallyTimeline(){
    $('rally-share-text').hidden=!plan;
    txt('share-hint',t(plan?'shareHint':'shareEmpty'));
    $('copy-rally').disabled=!plan;
    $('rally-share-text').value=K.rallyShareText(plan,{leader:n=>t('leaderName',{n})});
    $('rally-timeline').innerHTML=!plan?`<div class="result-placeholder">${t('timelineEmpty')}</div>`:plan.rows.map((r,i)=>`<div class="timeline-row" id="launch-row-${r.id}"><span class="order">${i+1}</span><div><b>${esc(rowName(r))}</b><small>${t('rowDurations',{prepare:duration(r.prepareSeconds),march:duration(r.marchSeconds)})}</small></div><div class="time">${K.formatUtc(r.launchAt).slice(11)}<small>${K.formatUtc(r.launchAt).slice(0,10)}</small><small id="launch-timer-${r.id}"></small></div></div>`).join('');
  }
  function renderGuardTimeline(){
    txt('recorded-count',t('recordCount',{n:records.size}));const sorted=[...records.values()].sort((a,b)=>a.arrivalAt-b.arrivalAt);
    $('guard-timeline').innerHTML=!sorted.length?`<div class="result-placeholder">${t('attackEmpty')}</div>`:sorted.map((r,i)=>`<div class="timeline-row" id="attack-row-${r.id}"><span class="order">${i+1}</span><div><b>${esc(rowName(r,'guard'))}</b><small>${t('attackArrival')}</small></div><div class="time">${clock(r.arrivalAt,true)}<small id="attack-timer-${r.id}"></small></div></div>${windows[i]?`<div class="window-strip ${windows[i].usable?'':'unusable'} ${windows[i].narrow?'narrow-window':''}" id="window-${i}"><span>${t(windows[i].narrow?'narrowGap':windows[i].usable?'availableGap':'insufficientGap')}</span><b>${windows[i].usable?duration(windows[i].width):t('noSafeWindow')}</b>${windows[i].narrow?`<small>${t('hospitalWarning')}</small>`:''}</div>`:''}`).join('')+(sorted.length===1?`<div class="result-placeholder">${t('needOneMore')}</div>`:'');
    renderBattleTimeline();
  }
  function renderBattleTimeline(){
    const sorted=[...records.values()].sort((a,b)=>a.arrivalAt-b.arrivalAt);
    $('battle-empty').hidden=!!sorted.length;$('battle-chart').hidden=!sorted.length;
    const rangeText=(w,kind)=>!w.usable?t('battleBlockedDetail',{before:rowName(w.before,'guard'),after:rowName(w.after,'guard')}):t('battleRange',{kind:t(kind==='departure'?'battleDeparture':'battleArrival'),before:rowName(w.before,'guard'),after:rowName(w.after,'guard'),start:K.formatUtc(kind==='departure'?w.start:w.arrivalStart),end:K.formatUtc(kind==='departure'?w.end:w.arrivalEnd),width:duration(w.width)})+(w.narrow?' · '+t('hospitalWarning'):'');
    const band=(w,i,kind)=>`<button type="button" id="battle-${kind}-${i}" class="battle-band ${kind} ${!w.usable?'blocked':w.narrow?'narrow':''}" title="${esc(rangeText(w,kind))}" aria-label="${esc(rangeText(w,kind))}" data-battle-detail="${esc(rangeText(w,kind))}" hidden>${w.usable?esc(duration(w.width)):''}</button>`;
    $('battle-departures').innerHTML=windows.map((w,i)=>w.usable?band(w,i,'departure'):'').join('');
    $('battle-arrivals').innerHTML=windows.map((w,i)=>band(w,i,'arrival')).join('');
    $('battle-enemies').innerHTML=sorted.map((r,i)=>`<div class="battle-row" id="battle-enemy-${i}" hidden><span class="battle-label" title="${esc(rowName(r,'guard'))}">${esc(rowName(r,'guard'))}</span><div class="battle-track"><span class="battle-marker" id="battle-marker-${i}" role="img" aria-label="${esc(t('battleAttackDetail',{name:rowName(r,'guard'),time:K.formatUtc(r.arrivalAt)}))}" title="${esc(K.formatUtc(r.arrivalAt))}"><i></i><span>${K.formatUtc(r.arrivalAt).slice(11,23)}</span></span></div></div>`).join('');
    battleNodes={attacks:sorted.map((r,i)=>({row:$(`battle-enemy-${i}`),marker:$(`battle-marker-${i}`)})),windows:windows.map((w,i)=>({departure:$(`battle-departure-${i}`),arrival:$(`battle-arrival-${i}`)}))};
    txt('battle-detail',t('battleDetailHint'));
  }
  function updateBattleTimeline(time,positionsOnly=false){
    if(!records.size)return;
    const view=K.battleTimeline([...records.values()],windows,time);
    const position=(el,left)=>{el.style.transform=`translateX(${left/100*battleTrackWidth}px)`;};
    const place=(el,range,active)=>{if(!el)return;if(el.hidden!==!range)el.hidden=!range;if(!range)return;position(el,range.left);el.style.width=range.width+'%';el.classList.toggle('open',active);};
    view.attacks.forEach((a,i)=>{const {row,marker}=battleNodes.attacks[i];if(row.hidden!==!a.visible)row.hidden=!a.visible;if(a.visible){position(marker,a.left);marker.classList.toggle('align-left',a.left>65);}});
    view.windows.forEach(({window:w,departure,arrival},i)=>{place(battleNodes.windows[i].departure,departure,time>=w.start&&time<w.end);place(battleNodes.windows[i].arrival,arrival,w.usable&&time>=w.arrivalStart&&time<w.arrivalEnd);});
    if(positionsOnly)return;
    const count=view.attacks.filter(a=>a.visible).length,next=view.attacks.find(a=>a.record.arrivalAt>time);
    let status=t('battleVisible',{time:K.formatUtc(time,false),n:count});
    if(!count)status+=' · '+(next?t('battleLater',{time:duration(Math.ceil((next.record.arrivalAt-time)/1000))}):t('battleFinished'));
    if(records.size===1)status+=' · '+t('battleOne');
    txt('battle-status',status);
  }
  function syncBattleAnimation(){
    if(state.tab!=='guard'||document.hidden||!records.size){if(battleFrame)cancelAnimationFrame(battleFrame);battleFrame=0;return;}
    if(!battleFrame)battleFrame=requestAnimationFrame(animateBattle);
  }
  function animateBattle(){
    battleFrame=0;
    if(state.tab!=='guard'||document.hidden||!records.size)return;
    // Read the current deadline each frame, so adjustments take effect without
    // easing or a second clock drifting away from the reinforcement countdown.
    updateBattleTimeline(now(),true);
    battleFrame=requestAnimationFrame(animateBattle);
  }
  function computeGuard(){windows=K.guardWindows([...records.values()],validOwn,validMargin);renderGuardTimeline();updateTimers();syncDesktopAlarms();}
  function addRow(kind){if(state[kind].length>=30)return toast('rowLimit');state[kind].push(fresh(kind));if(kind==='rally'){dirtyPlan();renderRallyRows();}else renderGuardRows();save();$(kind+'-rows').lastElementChild?.querySelector('input')?.focus();}
  function setSchedule(mode){state.schedule=mode;document.querySelectorAll('[data-schedule]').forEach(b=>{b.classList.toggle('selected',b.dataset.schedule===mode);b.setAttribute('aria-pressed',String(b.dataset.schedule===mode));});$('auto-settings').hidden=mode!=='auto';$('fixed-settings').hidden=mode!=='fixed';dirtyPlan();}
  function setTab(tab){state.tab=tab;document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});$('rally-page').hidden=tab!=='rally';$('guard-page').hidden=tab!=='guard';txt('breadcrumb-current',t(tab));try{history.replaceState(null,'','#'+tab);}catch{}updateTimers();syncDesktopAlarms();}
  function initAudio(){if(!state.sound)return;try{const A=window.AudioContext||window.webkitAudioContext;if(A){audio||=new A();if(audio.state==='suspended')audio.resume().catch(()=>{});}}catch{}}
  function beep(go){if(!audio||audio.state!=='running'||!state.sound)return;try{for(let i=0;i<(go?2:1);i++){const o=audio.createOscillator(),g=audio.createGain(),start=audio.currentTime+i*.19;o.connect(g);g.connect(audio.destination);o.frequency.value=go?900:540;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.13,start+.01);g.gain.exponentialRampToValueAtTime(.001,start+.14);o.start(start);o.stop(start+.15);}}catch{}}
  function alertAt(key,deadline,time,end){const d=(deadline-time)/1000;if(d>3||time>end)return;const stage=d<=0?'go':String(Math.ceil(d)),marker=`${key}:${stage}`;if(!fired.has(marker)){fired.add(marker);if(d>=-1)beep(stage==='go');}}
  function hero(kind,o){txt(`${kind}-state`,o.state);txt(`${kind}-next-name`,o.name);txt(`${kind}-countdown`,o.value);txt(`${kind}-instruction`,o.instruction);$(`${kind}-countdown`).classList.toggle('muted',!!o.muted);$(`${kind}-countdown`).classList.toggle('textual',/[^\d:.-]/.test(o.value));$(`${kind}-hero`).classList.toggle('go',!!o.go);$(`${kind}-hero`).classList.toggle('soon',!!o.soon);}
  function updateTimers(){
    const time=now();updatePets(time);txt('local-clock',t('localClock',{time:clock(time)}));
    txt('utc-clock',K.formatUtc(time,false));
    $('utc-clock').dateTime=new Date(time).toISOString();
    if(plan){
      txt('rally-arrival',K.formatUtc(plan.target));const next=K.nextRallyInstruction(plan.rows,time);
      if(next){const d=(next.launchAt-time)/1000,names=plan.rows.filter(r=>Math.abs(r.launchAt-next.launchAt)<1).map(r=>rowName(r)).join(' / ');hero('rally',{state:t(d<=0?'launchNow':d<=3?'launchSoon':'planActive'),name:t('nextGroup',{names}),value:d<=0?t('launch'):countdown(d),instruction:d<=0?t('launchInstruction'):t('launchAt',{time:K.formatUtc(next.launchAt)}),go:d<=0,soon:d>0&&d<=3});}
      else if(time<plan.target)hero('rally',{state:t('allLaunched'),name:t('arrivalIn'),value:countdown((plan.target-time)/1000),instruction:t('checkLaunched')});
      else hero('rally',{state:t('roundOver'),name:t('arrivalReached'),value:t('arrived'),instruction:t('newPlan'),muted:true});
      for(const r of plan.rows){const d=(r.launchAt-time)/1000,row=$(`launch-row-${r.id}`);row?.classList.toggle('past',d< -1.2);row?.classList.toggle('active',next?.launchAt===r.launchAt);txt(`launch-timer-${r.id}`,d>0?t('launchIn',{time:countdown(d)}):t('launchPassed'));if(state.tab==='rally')alertAt(`rally:${plan.target}:${r.launchAt}`,r.launchAt,time,r.launchAt+1200);}
    }else{hero('rally',{state:t('waitingPlan'),name:t('readyTogether'),value:'--:--',instruction:t('generateHint'),muted:true});txt('rally-arrival',t('notScheduled'));}
    const w=K.nextWindow(windows,time);
    $('guard-hero').classList.toggle('narrow-window',!!w?.narrow);
    $('guard-warning').hidden=!w?.narrow;
    txt('guard-warning',w?.narrow?'⚠ '+t('narrowGap')+' · '+t('hospitalWarning'):'');
    if(w){const d=(w.midpoint-time)/1000,go=time>=w.midpoint;hero('guard',{state:t(go?'sendNow':time>=w.start?'sendOpen':d<=3?'sendSoon':'waitingSend'),name:t('between',{before:rowName(w.before,'guard'),after:rowName(w.after,'guard')}),value:go?t('sendNow'):countdown(d),instruction:go?t('sendLeft',{time:countdown((w.end-time)/1000)}):t('sendAt',{time:clock(w.midpoint,true)}),go,soon:d>0&&d<=3});txt('guard-departure',`${clock(w.start,true)} – ${clock(w.end,true)}`);txt('guard-width',duration(w.width));if(state.tab==='guard')alertAt(`guard:${w.id}`,w.midpoint,time,w.end);}
    else{let instruction='twoNeeded',name='waitingEnemy',status='waitingRecord';if(records.size===1){name='needAnother';instruction='needAnotherHint';}else if(records.size>=2){status='noWindow';if(windows.some(w=>w.usable)){name='missed';instruction='missedHint';}else{name='gapShort';instruction='gapShortHint';}}hero('guard',{state:t(status),name:t(name),value:'--:--',instruction:t(instruction),muted:true});txt('guard-departure',t('noTime'));txt('guard-width','—');}
    for(const r of records.values()){const d=(r.arrivalAt-time)/1000;txt(`attack-timer-${r.id}`,d>0?t('attackIn',{time:countdown(d)}):t('attackPassed'));$(`attack-row-${r.id}`)?.classList.toggle('past',d<=0);updateEnemyClock(r,time);}
    windows.forEach((w,i)=>$(`window-${i}`)?.classList.toggle('expired',w.end<=time));
    if(state.tab==='guard')updateBattleTimeline(time);
    syncBattleAnimation();
  }
  function syncDesktopAlarms(){
    if(!desktop)return;const events=[];
    if(state.sound&&state.tab==='rally'&&plan)for(const r of plan.rows)events.push({id:`r:${r.launchAt}`,at:r.launchAt,expiresAt:r.launchAt+1200,title:t('launchNow'),body:rowName(r)});
    if(state.sound&&state.tab==='guard')for(const w of windows.filter(w=>w.usable))events.push({id:`g:${w.id}`,at:w.midpoint,expiresAt:w.end,title:t('sendNow'),body:t('between',{before:rowName(w.before,'guard'),after:rowName(w.after,'guard')})});
    if(state.sound)for(const kind of ['rally','guard'])for(const r of state[kind]){const pet=K.petTiming(r.pet,now());if(pet&&pet.stage!=='uncertain')events.push({id:`pet:${r.id}:${r.pet.observedAt}:${r.pet.startedAt}`,at:pet.warnAt,expiresAt:pet.end,title:t(kind==='rally'?'rallyPetReminderTitle':'petReminderTitle'),body:t(kind==='rally'?'rallyPetReminder':'petReminder',{names:rowName(r,kind)})});}
    desktop.setAlarms(events).catch(()=>{});
  }
  function invalidateSession(clockChanged=false){
    if(clockChanged){for(const r of [...state.rally,...state.guard])if(r.pet)r.pet.clockChanged=true;save();}
    if(!plan&&!records.size){updateTimers();syncDesktopAlarms();return;}
    plan=null;records.clear();windows=[];fired.clear();$('rally-dirty').hidden=true;$('stop-rally').disabled=true;sessionInvalid=true;txt('session-notice',t('sleepReset'));$('session-notice').hidden=false;
    renderRallyTimeline();renderGuardRows();renderGuardTimeline();updateTimers();syncDesktopAlarms();
  }
  function clearNotice(){sessionInvalid=false;$('session-notice').hidden=true;}
  function syncControls(){txt('sound-toggle',t(state.sound?'soundOn':'soundOff'));$('sound-toggle').setAttribute('aria-pressed',String(state.sound));txt('focus-toggle',t(state.focus?'edit':'focus'));txt('pin-toggle',t(state.pinned?'pinOn':'pinOff'));$('pin-toggle').setAttribute('aria-pressed',String(state.pinned));$('language-select').value=I.language;txt('breadcrumb-current',t(state.tab));txt('guard-settings-state',t(settingsValid?'applied':'notApplied'));if(desktop)document.querySelector('.foreground-note').textContent=t('desktopHint');}
  function changeLanguage(value){I.setLanguage(value);I.apply();syncControls();renderRallyRows();renderGuardRows();renderRallyTimeline();renderGuardTimeline();for(const [id,{err,suffix}]of errors)showError(id,err,suffix);if(sessionInvalid)txt('session-notice',t('sleepReset'));$('toast').hidden=true;updateTimers();syncDesktopAlarms();save();}
  function applySettings(){state.own=$('own-march').value;state.margin=$('guard-margin').value;try{K.parseDuration(state.own,false);K.parseDuration(state.margin);validOwn=state.own;validMargin=state.margin;settingsValid=true;showError('guard-settings-error');computeGuard();}catch(e){settingsValid=false;showError('guard-settings-error',e,'oldSettings');}syncControls();save();}
  document.addEventListener('click',initAudio,{capture:true});
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
  document.querySelectorAll('[data-schedule]').forEach(b=>b.addEventListener('click',()=>setSchedule(b.dataset.schedule)));
  for(const kind of ['rally','guard']){
    $(`add-${kind}`).addEventListener('click',()=>addRow(kind));$(`first-${kind}`).addEventListener('click',()=>addRow(kind));
    $(`${kind}-rows`).addEventListener('input',e=>{const holder=e.target.closest('[data-id]'),field=e.target.dataset.field;if(!holder||!field)return;const r=state[kind].find(r=>r.id===holder.dataset.id);r[field]=e.target.value;if(kind==='rally'){dirtyPlan();updateRallyHint(r);}else updateGuardRow(r);save();});
    $(`${kind}-rows`).addEventListener('input',e=>{if(!e.target.matches('[data-pet-elapsed]'))return;const r=state[kind].find(r=>r.id===e.target.closest('[data-id]').dataset.id);r.petElapsed=e.target.value;save();});
    $(`${kind}-rows`).addEventListener('click',e=>{
      const holder=e.target.closest('[data-id]');if(!holder)return;const id=holder.dataset.id,r=state[kind].find(r=>r.id===id);
      if(e.target.closest('[data-delete]')){if((records.has(id)||r.pet||(kind==='rally'&&plan))&&!confirm(t('deleteConfirm')))return;state[kind]=state[kind].filter(r=>r.id!==id);errors.delete(`guard-error-${id}`);errors.delete(`pet-error-${id}`);if(kind==='rally'){dirtyPlan();renderRallyRows();}else{records.delete(id);renderGuardRows();computeGuard();}save();syncDesktopAlarms();return;}
      if(e.target.closest('[data-pet-start]')){try{r.pet=K.makePetEstimate(r.petElapsed,now());showError(`pet-error-${id}`);save();if(kind==='rally')renderRallyRows();else renderGuardRows();syncDesktopAlarms();toast('petStarted');}catch(err){showError(`pet-error-${id}`,err);}return;}
      if(e.target.closest('[data-pet-stop]')){r.pet=null;r.petElapsed='0';showError(`pet-error-${id}`);save();if(kind==='rally')renderRallyRows();else renderGuardRows();syncDesktopAlarms();return;}
      const mode=e.target.closest('[data-mode]');if(mode){r.mode=mode.dataset.mode;renderGuardRows();save();return;}
      const adjust=e.target.closest('[data-adjust]');if(adjust){const rec=records.get(id);if(!rec)return;try{const updated=K.adjustEnemy(rec,adjust.dataset.adjust,Number(adjust.dataset.delta),now());updated.adjusted=true;records.set(id,updated);showError(`guard-error-${id}`);updateGuardRow(r);computeGuard();}catch(err){showError(`guard-error-${id}`,err,'oldRecord');}return;}
      if(e.target.closest('[data-record]')){const recordedAt=now();try{const snapshot=K.recordEnemy(r,recordedAt);snapshot.index=state.guard.indexOf(r);snapshot.draft=battleDraft(r);records.set(id,snapshot);showError(`guard-error-${id}`);updateGuardRow(r);clearNotice();computeGuard();toast('recordToast',{name:rowName(snapshot,'guard'),time:clock(snapshot.arrivalAt,true)});}catch(err){showError(`guard-error-${id}`,err,records.has(id)?'oldRecord':null);}}
    });
  }
  for(const kind of ['rally','guard'])$(kind==='rally'?'rally-pet-update-march':'pet-update-march').addEventListener('click',async()=>{const r=state[kind].find(r=>K.petTiming(r.pet,now())?.needsReview);if(!r)return;state.focus=false;document.body.classList.remove('focus-mode');syncControls();setTab(kind);if(desktop)try{await desktop.setCompact(false);}catch{}const panel=$(`pet-panel-${r.id}`);panel.closest('[data-id]').querySelector('[data-field="march"]').focus();panel.closest('[data-id]').scrollIntoView({block:'center',behavior:'smooth'});});
  $('rally-lead').addEventListener('input',()=>{state.lead=$('rally-lead').value;dirtyPlan();save();});
  $('rally-target').addEventListener('input',()=>{state.target=$('rally-target').value;dirtyPlan();});
  $('copy-rally').addEventListener('click',async()=>{
    if(!plan)return;
    const output=$('rally-share-text'),value=output.value;
    try{await navigator.clipboard.writeText(value);toast('scheduleCopied');}
    catch{
      output.focus();output.select();output.setSelectionRange(0,value.length);
      let copied=false;try{copied=document.execCommand('copy');}catch{}
      toast(copied?'scheduleCopied':'copyFallback');
    }
  });
  $('start-rally').addEventListener('click',()=>{try{plan=K.makeRallyPlan(state.rally,now(),state.schedule==='fixed'?{target:new Date(state.target).getTime()}:{lead:state.lead});$('rally-dirty').hidden=true;$('stop-rally').disabled=false;showError('rally-error');clearNotice();renderRallyTimeline();updateTimers();syncDesktopAlarms();showResult('rally');toast('planToast');}catch(err){showError('rally-error',err,plan?'oldPlan':null);}});
  $('stop-rally').addEventListener('click',()=>{if(!confirm(t('stopConfirm')))return;plan=null;$('rally-dirty').hidden=true;$('stop-rally').disabled=true;renderRallyTimeline();updateTimers();syncDesktopAlarms();});
  $('own-march').addEventListener('input',applySettings);$('guard-margin').addEventListener('input',applySettings);
  $('battle-chart').addEventListener('click',e=>{const band=e.target.closest('[data-battle-detail]');if(band)txt('battle-detail',band.dataset.battleDetail);});
  $('language-select').addEventListener('change',e=>changeLanguage(e.target.value));
  $('sound-toggle').addEventListener('click',()=>{state.sound=!state.sound;syncControls();save();syncDesktopAlarms();if(state.sound){initAudio();beep(false);if(!audio)toast('noAudio');}});
  $('focus-toggle').addEventListener('click',async()=>{state.focus=!state.focus;document.body.classList.toggle('focus-mode',state.focus);syncControls();if(desktop)try{await desktop.setCompact(state.focus);}catch{toast('desktopError');}});
  $('pin-toggle').addEventListener('click',async()=>{try{state.pinned=await desktop.setPinned(!state.pinned);syncControls();}catch{toast('desktopError');}});
  $('rally-example').addEventListener('click',()=>{if(state.rally.length&&!confirm(t('rallyExampleConfirm')))return;state.rally=[{...fresh('rally','A'),march:'35'},{...fresh('rally','B'),march:'25'},{...fresh('rally','C'),prepare:'1:00',march:'40'}];plan=null;$('rally-dirty').hidden=true;$('stop-rally').disabled=true;setSchedule('auto');showError('rally-error');renderRallyRows();renderRallyTimeline();updateTimers();syncDesktopAlarms();save();toast('rallyExampleToast');});
  $('guard-example').addEventListener('click',()=>{if(state.guard.length&&!confirm(t('guardExampleConfirm')))return;records.clear();state.guard=[{...fresh('guard','A'),prepare:'4:00',march:'35'},{...fresh('guard','B'),prepare:'4:00',march:'38'}];renderGuardRows();computeGuard();save();toast('guardExampleToast');});
  $('clear-page').addEventListener('click',()=>{const kind=state.tab;if(!confirm(t('clearConfirm',{tool:t(kind)})))return;state[kind]=[];if(kind==='rally'){plan=null;state.lead='10';state.target='';$('rally-lead').value='10';$('rally-target').value='';setSchedule('auto');$('rally-dirty').hidden=true;$('stop-rally').disabled=true;showError('rally-error');renderRallyRows();renderRallyTimeline();}else{records.clear();state.own=validOwn='29';state.margin=validMargin='0.2';$('own-march').value='29';$('guard-margin').value='0.2';settingsValid=true;showError('guard-settings-error');renderGuardRows();computeGuard();}clearNotice();syncControls();save();updateTimers();syncDesktopAlarms();toast('cleared');});
  restore();I.apply();$('own-march').value=state.own;$('guard-margin').value=state.margin;$('rally-lead').value=state.lead;syncControls();renderRallyRows();renderRallyTimeline();renderGuardRows();computeGuard();setTab(location.hash==='#guard'?'guard':'rally');
  // Cache the shared track width when layout changes, never read layout during
  // animation. Transform positioning preserves subpixel movement between ticks.
  new ResizeObserver(entries=>{battleTrackWidth=entries[0].contentRect.width;if(state.tab==='guard'&&!document.hidden)updateBattleTimeline(now(),true);}).observe($('battle-departures'));
  setInterval(()=>{const wall=Date.now(),mono=performance.now();const clockChanged=Math.abs((wall-previousWall)-(mono-previousMono))>3000;if(clockChanged||wall-previousWall>10000)invalidateSession(clockChanged);previousWall=wall;previousMono=mono;updateTimers();},100);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateTimers();else syncBattleAnimation();});window.addEventListener('hashchange',()=>setTab(location.hash==='#guard'?'guard':'rally'));
  if(desktop){$('pin-toggle').hidden=false;desktop.onResume(()=>{invalidateSession();previousWall=Date.now();previousMono=performance.now();});desktop.getWindowState().then(s=>{state.pinned=s.pinned;syncControls();}).catch(()=>{});}
  if(!desktop&&'serviceWorker'in navigator&&['https:','http:'].includes(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
