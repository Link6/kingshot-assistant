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
  function gaps(rows,margin=0.2){
    if(rows.length<2)return `<p class="result-placeholder">${t('gapNeedTwo')}</p>`;
    return K.rallyGaps(rows,margin).map(g=>`<div class="rally-gap ${g.usable?'has-gap':''}"><div><b>${esc(g.before.name)} → ${esc(g.after.name)}</b><small>${esc(t('landingGap',{seconds:I.number(g.width)}))}</small></div><div><strong>${g.usable?esc(t('insertionWidth',{seconds:I.number(g.safeWidth)})):t('noInsertionWindow')}</strong>${g.usable?`<small>${esc(K.formatUtc(g.start))} – ${esc(K.formatUtc(g.end).slice(11))}</small>`:''}</div></div>`).join('');
  }
  window.KingshotBattleUI={esc,countdown,localTime,orders,tick,gaps};
})();
