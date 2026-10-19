(function(){
  'use strict';
  const K=window.KingshotTiming,I=window.KingshotI18n,t=(k,p)=>I.t(k,p);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function countdown(seconds){const ticks=Math.ceil(Math.max(0,seconds)*10),whole=Math.floor(ticks/10);return (whole>=3600?Math.floor(whole/3600)+':':'')+String(Math.floor(whole/60)%60).padStart(2,'0')+':'+String(whole%60).padStart(2,'0')+'.'+ticks%10;}
  const localTime=at=>new Date(at-new Date(at).getTimezoneOffset()*60000).toISOString().slice(0,23);
  function orders(rows,editable=false){
    return rows.map(r=>`<article class="rally-order" data-order-id="${esc(r.id)}"><header><b>${esc(r.name)}</b><span class="pill neutral">${t(r.confirmed?'calibrated':'estimatedLaunch')}</span></header><div class="order-times"><div><small>${t('rallyLaunchTime')}</small><strong>${esc(K.formatUtc(r.launchAt))}</strong></div><div><small>${t('attackArrival')}</small><strong>${esc(K.formatUtc(r.arrivalAt))}</strong></div></div><div class="order-countdown"><span data-order-stage></span><strong data-order-countdown></strong></div><small>${esc(t('orderDurations',{prepare:r.prepareSeconds,march:r.marchSeconds}))}</small>${editable?`<details class="launch-calibration"><summary>${t('calibrateLaunch')}</summary><p>${t('calibrateHint')}</p><div class="time-nudges">${[-1,-0.1,0.1,1].map(d=>`<button type="button" data-rally-delta="${d}">${d>0?'+':'−'}${Math.abs(d)}s</button>`).join('')}</div><button type="button" class="button secondary" data-rally-now>${t('launchObservedNow')}</button><label>${t('actualLaunchLocal')}<input type="datetime-local" step="0.001" data-rally-at value="${localTime(r.launchAt)}"></label><button type="button" class="text-button" data-rally-set>${t('applyLaunchTime')}</button></details>`:''}</article>`).join('');
  }
  function tick(container,rows,time){for(const r of rows){const card=container.querySelector(`[data-order-id="${CSS.escape(r.id)}"]`);if(!card)continue;const timing=K.rallyTiming(r,time),stage=timing.stage==='waiting'?'launchCountdown':timing.stage==='launch'?'launchNow':timing.stage==='gathering'?'prepareRemaining':timing.stage==='marching'?'marchRemaining':'arrived';card.querySelector('[data-order-stage]').textContent=t(stage);card.querySelector('[data-order-countdown]').textContent=timing.stage==='launch'?t('launch'):timing.stage==='arrived'?'—':countdown(timing.remaining);card.classList.toggle('go',timing.stage==='launch');}}
  function gaps(rows){
    if(rows.length<2)return `<p class="result-placeholder">${t('gapNeedTwo')}</p>`;
    return K.rallyGaps(rows,0).map(g=>`<div class="rally-gap ${g.usable?'has-gap':''}"><div><b>${esc(g.before.name)} → ${esc(g.after.name)}</b><small>${esc(t('landingGap',{seconds:I.number(g.width)}))}</small></div><div><strong>${g.usable?esc(t('insertionWidth',{seconds:I.number(g.safeWidth)})):t('noInsertionWindow')}</strong>${g.usable?`<small>${esc(K.formatUtc(g.start))} – ${esc(K.formatUtc(g.end).slice(11))}</small>`:''}</div></div>`).join('');
  }
  const advisors=new WeakMap();
  function boostItems(plan){return [plan.n50?t('boostCount',{percent:50,n:plan.n50}):'',plan.n25?t('boostCount',{percent:25,n:plan.n25}):''].filter(Boolean).join(' + ')||t('boostNoItems');}
  function boostAdvisor(container,windows,march,time,{key='local',enabled=true}={}){
    const storageKey='kingshot:'+new URL('.',location.href).pathname+':boost:'+key;
    let view=advisors.get(container);
    if(!view||view.key!==storageKey){
      let options={delay:'1',stock25:'',stock50:''};
      try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved)for(const k of Object.keys(options))if(typeof saved[k]==='string')options[k]=saved[k];}catch{}
      view={key:storageKey,options,language:null,signature:null};advisors.set(container,view);
      if(!container.dataset.boostBound){container.dataset.boostBound='true';container.addEventListener('input',e=>{
        if(!e.target.matches('[data-boost-setting]'))return;
        const current=advisors.get(container);current.options[e.target.dataset.boostSetting]=e.target.value;
        try{localStorage.setItem(current.key,JSON.stringify(current.options));}catch{}
        window.dispatchEvent(new Event('kingshot:boost-settings'));
      });}
    }
    if(view.language!==I.language){
      const open=container.querySelector('details')?.open;
      container.innerHTML=`<p class="field-note">${t('boostHint')}</p><p class="field-note" data-boost-assumption></p><details class="boost-settings" ${open?'open':''}><summary>${t('boostSettings')}</summary><div class="field-grid"><label>${t('boostStock',{percent:25})}<input type="number" min="0" max="9999" step="1" data-boost-setting="stock25" placeholder="${t('boostUnlimited')}" value="${esc(view.options.stock25)}"></label><label>${t('boostStock',{percent:50})}<input type="number" min="0" max="9999" step="1" data-boost-setting="stock50" placeholder="${t('boostUnlimited')}" value="${esc(view.options.stock50)}"></label><label>${t('boostDelay')}<input type="number" min="0.1" max="30" step="0.1" data-boost-setting="delay" value="${esc(view.options.delay)}"></label></div><p class="field-note">${t('boostSettingsHint')}</p></details><p class="form-error" data-boost-error role="alert" hidden></p><div data-boost-results></div>`;
      view.language=I.language;view.signature=null;
    }
    const assumption=container.querySelector('[data-boost-assumption]'),assumptionText=t('boostAssumption',{delay:view.options.delay});
    if(assumption.textContent!==assumptionText)assumption.textContent=assumptionText;
    let analyses=[],invalid=false;
    if(enabled&&march)try{analyses=K.reinforcementBoosts(windows,march,time,view.options);}catch{invalid=true;}
    const error=container.querySelector('[data-boost-error]');error.hidden=!invalid;error.textContent=invalid?t('boostInvalid'):'';
    const result=container.querySelector('[data-boost-results]');
    const planKey=p=>p&&[p.n25,p.n50,p.seconds,p.start,p.end,p.start<=time+Number(view.options.delay)*1000];
    const signature=JSON.stringify([enabled,!!march,invalid,analyses.map(a=>[a.window.id,a.window.before.name,a.window.after.name,planKey(a.normal),planKey(a.recommended),planKey(a.only25),planKey(a.only50)])]);
    if(view.signature!==signature){
      result.innerHTML=analyses.length?analyses.map((a,i)=>{
        const w=a.window,p=a.recommended,normal=!!a.normal;
        const range=plan=>`${plan.start<=time+Number(view.options.delay)*1000?t('boostReady'):esc(K.formatUtc(plan.start))} → ${esc(K.formatUtc(plan.end))}`;
        const alternatives=[a.only25,a.only50].filter((p,i,all)=>p&&p.count>0&&(p.n25!==a.recommended?.n25||p.n50!==a.recommended?.n50)&&all.indexOf(p)===i);
        return `<article class="boost-window ${p&&!normal?'needs-boost':''}" data-boost-window="${i}"><header><b>${esc(w.before.name||t('enemyName',{n:i+1}))} → ${esc(w.after.name||t('enemyName',{n:i+2}))}</b><span class="pill neutral">${t(normal?'boostNormal':p?'boostReachable':'boostCannotReach')}</span></header><p class="boost-landing"><span>${t('battleArrival')} · ${esc(I.number(w.width))} ${t('seconds')}</span><strong>${esc(K.formatUtc(w.arrivalStart))} → ${esc(K.formatUtc(w.arrivalEnd))}</strong></p>${p?`<div class="boost-recommendation"><b>${normal?t('boostNoItems'):esc(t('boostRecommend',{items:boostItems(p)}))}</b><p>${normal?'':esc(t('boostTravel',{seconds:I.number(Math.ceil(p.seconds*100)/100)}))}</p><small>${t('boostDepart')}: ${range(p)}</small><small>${t('boostLatest')}: <strong data-boost-deadline></strong></small>${normal?'':`<p class="boost-action">${esc(t('boostSequence',{delay:view.options.delay,items:boostItems(p)}))}</p>`}</div>${alternatives.length?`<div class="boost-alternatives"><span>${t('boostAlternatives')}</span>${alternatives.map(p=>`<p><b>${esc(boostItems(p))}</b> · ${esc(t('boostTravel',{seconds:I.number(Math.ceil(p.seconds*100)/100)}))}<small>${t('boostDepart')}: ${range(p)}</small></p>`).join('')}</div>`:''}`:`<p class="field-note">${t('boostUnavailable')}</p>`}${w.narrow?`<p class="boost-caution">${t('hospitalWarning')}</p>`:''}</article>`;
      }).join(''):`<p class="result-placeholder">${t(!enabled?'boostPaused':invalid?'boostInvalid':!march?'marchNeedsCheck':windows.some(w=>w.usable)?'boostFinished':windows.length?'noSafeWindow':'twoNeeded')}</p>`;
      view.signature=signature;
    }
    analyses.forEach((a,i)=>{const node=result.querySelector(`[data-boost-window="${i}"] [data-boost-deadline]`);if(node)node.textContent=countdown((a.recommended.end-time)/1000);});
    return analyses;
  }
  window.KingshotBattleUI={esc,countdown,localTime,orders,tick,gaps,boostAdvisor,boostItems};
})();
