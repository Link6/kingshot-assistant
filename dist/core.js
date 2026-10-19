(function (root) {
  'use strict';
  const MAX_SECONDS = 7 * 86400;
  class TimingError extends Error {
    constructor(code, params = {}) { super(code); this.code = code; this.params = params; }
  }
  function parseDuration(value, allowZero = true) {
    const raw = String(value ?? '').trim().toLowerCase();
    let n = NaN;
    if (/^\d+(?:\.\d+)?$/.test(raw)) n = Number(raw);
    else if (/^\d+:\d{1,2}(?:\.\d+)?$/.test(raw)) {
      const [m, s] = raw.split(':').map(Number);
      if (s < 60) n = m * 60 + s;
    } else if (/^\d+:\d{1,2}:\d{1,2}(?:\.\d+)?$/.test(raw)) {
      const [h, m, s] = raw.split(':').map(Number);
      if (m < 60 && s < 60) n = h * 3600 + m * 60 + s;
    } else if (/^(?:(\d+(?:\.\d+)?)\s*h\s*)?(?:(\d+(?:\.\d+)?)\s*(?:min|m)\s*)?(?:(\d+(?:\.\d+)?)\s*s\s*)?$/.test(raw) && raw) {
      const match = raw.match(/^(?:(\d+(?:\.\d+)?)\s*h\s*)?(?:(\d+(?:\.\d+)?)\s*(?:min|m)\s*)?(?:(\d+(?:\.\d+)?)\s*s\s*)?$/);
      n = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
    } else if (/^(?:(\d+(?:\.\d+)?)小时)?(?:(\d+(?:\.\d+)?)分)?(?:(\d+(?:\.\d+)?)秒)?$/.test(raw) && raw) {
      const match = raw.match(/^(?:(\d+(?:\.\d+)?)小时)?(?:(\d+(?:\.\d+)?)分)?(?:(\d+(?:\.\d+)?)秒)?$/);
      n = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
    }
    if (!Number.isFinite(n) || n > MAX_SECONDS || n < 0 || (!allowZero && n === 0)) {
      throw new TimingError(allowZero ? 'invalidTime' : 'positiveTime');
    }
    return n;
  }
  function makeRallyPlan(rows, now, options = {}) {
    const enabled = rows.map((r,index) => ({...r,index})).filter(r => r.enabled !== false);
    if (!enabled.length) throw new TimingError('noLeaders');
    const parsed = enabled.map(r => {
      const i = r.index;
      try { return {...r, name: r.name.trim(), index:i, prepareSeconds: parseDuration(r.prepare), marchSeconds: parseDuration(r.march, false)}; }
      catch (e) { throw new TimingError('rowError', {name:r.name.trim(), index:i, reason:e.code}); }
    });
    const lead = options.lead === undefined ? 10 : parseDuration(options.lead, false);
    const longest = Math.max(...parsed.map(r => r.prepareSeconds + r.marchSeconds));
    const target = options.target === undefined ? now + (longest + lead) * 1000 : options.target;
    if (!Number.isFinite(target)) throw new TimingError('invalidTarget');
    const result = parsed.map(r => ({...r, launchAt: target - (r.prepareSeconds + r.marchSeconds) * 1000, arrivalAt: target}));
    if (result.some(r => r.launchAt <= now)) throw new TimingError('tooLate');
    return {target, rows: result.sort((a, b) => a.launchAt - b.launchAt)};
  }
  function formatMinutesSeconds(value) {
    const milliseconds=Math.round(parseDuration(value)*1000),whole=Math.floor(milliseconds/1000);
    const fraction=String(milliseconds%1000).padStart(3,'0').replace(/0+$/,'');
    return Math.floor(whole/60)+':'+String(whole%60).padStart(2,'0')+(fraction?'.'+fraction:'');
  }
  function recordEnemy(row, now) {
    const prepare = row.mode === 'marching' ? 0 : parseDuration(row.prepare);
    const march = parseDuration(row.march, false);
    return {id: row.id, name: row.name.trim(), mode:row.mode, recordedAt: now, departAt:now + prepare * 1000, marchSeconds:march, arrivalAt: now + (prepare + march) * 1000};
  }
  function adjustRallyPlan(plan, id, change) {
    if (!plan?.rows.some(r => r.id === id)) throw new TimingError('noLeaders');
    const rows = plan.rows.map(r => {
      if (r.id !== id) return {...r};
      if (change.at === undefined && ![-1,-0.1,0.1,1].includes(change.delta)) throw new TimingError('invalidTime');
      const launchAt = change.at === undefined ? Math.round(r.launchAt + change.delta * 1000) : change.at;
      if (!Number.isFinite(launchAt) || !Number.isFinite(new Date(launchAt).getTime())) throw new TimingError('invalidTarget');
      return {...r, plannedLaunchAt:r.plannedLaunchAt ?? r.launchAt, launchAt, confirmed:change.at!==undefined||!!r.confirmed,
        arrivalAt:launchAt + (r.prepareSeconds + r.marchSeconds) * 1000};
    }).sort((a,b) => a.launchAt - b.launchAt);
    return {...plan, rows};
  }
  function rallyGaps(rows, margin = 0) {
    const pad = parseDuration(margin) * 1000;
    const sorted = [...rows].sort((a,b) => a.arrivalAt - b.arrivalAt);
    return sorted.slice(0,-1).map((before,i) => {
      const after = sorted[i+1], start = before.arrivalAt + pad, end = after.arrivalAt - pad;
      return {before,after,start,end,width:(after.arrivalAt-before.arrivalAt)/1000,
        safeWidth:Math.max(0,(end-start)/1000),usable:end>start};
    });
  }
  function rallyTiming(row, now) {
    const departAt = row.launchAt + row.prepareSeconds * 1000;
    const arrivalAt = departAt + row.marchSeconds * 1000;
    const stage = now < row.launchAt ? 'waiting' : now >= arrivalAt ? 'arrived' : !row.confirmed && now-row.launchAt<1200 ? 'launch' : now < departAt ? 'gathering' : 'marching';
    return {stage, departAt, arrivalAt,remaining:Math.max(0,((stage==='waiting'||stage==='launch'?row.launchAt:stage==='gathering'?departAt:arrivalAt)-now)/1000)};
  }
  function enemyCountdown(record, now) {
    const prepare = Math.max(0, (record.departAt - now) / 1000);
    const march = Math.max(0, (record.arrivalAt - Math.max(now, record.departAt)) / 1000);
    return {prepare, march, stage:now >= record.arrivalAt ? 'arrived' : now >= record.departAt ? 'marching' : 'gathering'};
  }
  function adjustEnemy(record, field, delta, now) {
    if (!['prepare','march'].includes(field) || ![-1,-0.1,0.1,1].includes(delta)) throw new TimingError('invalidTime');
    const shift = Math.round(delta * 1000);
    if (field === 'prepare') {
      if (record.mode === 'marching' || now >= record.departAt) throw new TimingError('prepareEnded');
      if (record.departAt + shift < now) throw new TimingError('adjustBelowZero');
      if (record.departAt + shift - record.recordedAt > MAX_SECONDS * 1000) throw new TimingError('invalidTime');
      return {...record, departAt:record.departAt + shift, arrivalAt:record.arrivalAt + shift};
    }
    const marchSeconds = (Math.round(record.marchSeconds * 1000) + shift) / 1000;
    parseDuration(marchSeconds, false);
    return {...record, marchSeconds, arrivalAt:record.arrivalAt + shift};
  }
  function guardWindows(records, ownMarch, margin) {
    const own = parseDuration(ownMarch, false) * 1000;
    const pad = parseDuration(margin) * 1000;
    const sorted = records.filter(r=>r.active!==false).sort((a, b) => a.arrivalAt - b.arrivalAt);
    return sorted.slice(0, -1).map((a, i) => {
      const b = sorted[i + 1];
      const arrivalStart = a.arrivalAt + pad;
      const arrivalEnd = b.arrivalAt - pad;
      const start = arrivalStart - own;
      const end = arrivalEnd - own;
      return {id: `${a.id}:${b.id}:${a.arrivalAt}:${b.arrivalAt}`, before: a, after: b, arrivalStart, arrivalEnd, start, end, midpoint: (start + end) / 2, width: (end - start) / 1000, usable: arrivalEnd > arrivalStart, narrow:arrivalEnd > arrivalStart && arrivalEnd - arrivalStart < 1000};
    });
  }
  function nextWindow(windows, now) { return windows.find(w => w.usable && w.end > now) || null; }
  function reinforcementBoosts(windows, ownMarch, now, options = {}) {
    const march=parseDuration(ownMarch,false),delay=parseDuration(options.delay??1,false);
    const stock=value=>{
      if(value==null||value==='')return Infinity;
      const n=Number(value);
      if(!/^\d+$/.test(String(value))||!Number.isSafeInteger(n)||n>9999)throw new TimingError('boostInvalid');
      return n;
    };
    const stock25=stock(options.stock25),stock50=stock(options.stock50);
    if(delay<0.1||delay>30||!Number.isFinite(now))throw new TimingError('boostInvalid');
    // Every click takes time before reducing the then-remaining march.
    // Larger reductions first give the shortest trip for a fixed item mix.
    const profiles=[];
    let remaining50=march;
    for(let n50=0;n50<=stock50;n50++){
      let remaining=remaining50;
      for(let n25=0;n25<=stock25;n25++){
        profiles.push({n25,n50,count:n25+n50,seconds:(n25+n50)*delay+remaining});
        if(remaining<=delay)break;
        remaining=(remaining-delay)*0.75;
      }
      if(remaining50<=delay)break;
      remaining50=(remaining50-delay)*0.5;
    }
    profiles.sort((a,b)=>a.count-b.count||a.n50-b.n50);
    return windows.filter(w=>w.usable&&w.arrivalEnd>now).map(window=>{
      const plans=profiles.map(p=>{
        const start=window.arrivalStart-p.seconds*1000,end=window.arrivalEnd-p.seconds*1000;
        const availableStart=Math.max(start,now+delay*1000);
        return {...p,start,end,availableStart,midpoint:(availableStart+end)/2};
      }).filter(p=>p.availableStart<p.end);
      return {window,normal:plans.find(p=>p.count===0)||null,recommended:plans[0]||null,
        only25:plans.find(p=>p.n50===0)||null,only50:plans.find(p=>p.n25===0)||null};
    });
  }
  function timelineRange(start, end, now, span = 60000) {
    if(!Number.isFinite(span)||span<=0||end<start||end<=now||start>=now+span)return null;
    return {left:(Math.max(now,start)-now)/span*100,width:(Math.min(now+span,end)-Math.max(now,start))/span*100};
  }
  // Both tracks share wall-clock time; departure is already shifted by own march.
  function battleTimeline(records, windows, now) {
    const span = 60000, limit = now + span;
    const clip = (start, end) => timelineRange(start,end,now,span);
    return {
      attacks: records.filter(r=>r.active!==false).sort((a, b) => a.arrivalAt - b.arrivalAt).map(record => ({record,
        visible:record.arrivalAt >= now && record.arrivalAt <= limit,
        left:(record.arrivalAt - now) / span * 100})),
      windows: windows.map(window => ({window,
        departure:window.usable ? clip(window.start, window.end) : null,
        arrival:window.usable ? clip(window.arrivalStart, window.arrivalEnd) : clip(window.before.arrivalAt, window.after.arrivalAt)}))
    };
  }
  function nextRallyInstruction(rows, now) {
    const recent = [...rows].reverse().find(r => r.launchAt <= now);
    if (recent && now - recent.launchAt < 1200) return recent;
    return rows.find(r => r.launchAt > now) || null;
  }
  function formatUtc(time, milliseconds = true) {
    const iso = new Date(time).toISOString();
    return iso.slice(0, milliseconds ? 23 : 19).replace('T', ' ') + ' UTC';
  }
  function rallyShareText(plan, labels) {
    if (!plan) return '';
    const clean = value => String(value).replace(/\s+/g, ' ').trim();
    return plan.rows.map(r => {
      const time = new Date(r.launchAt).toISOString().slice(11, 19);
      return `${clean(r.name) || labels.leader(r.index + 1)} ${time} UTC`;
    }).join('\n');
  }
  const PET_DURATION = 2 * 60 * 60 * 1000, PET_WARNING = 5 * 60 * 1000;
  function makePetEstimate(elapsedMinutes, now) {
    const raw = String(elapsedMinutes).trim(), minutes = Number(raw);
    if (!/^\d+(?:\.\d+)?$/.test(raw) || !Number.isFinite(minutes) || minutes < 0 || minutes > 120 || !Number.isFinite(now)) throw new TimingError('petElapsedInvalid');
    return {observedAt:now, startedAt:now - Math.round(minutes * 60000), alerted:false, clockChanged:false};
  }
  function restorePetEstimate(value) {
    if (!value || !Number.isSafeInteger(value.observedAt) || !Number.isSafeInteger(value.startedAt) || !Number.isFinite(new Date(value.startedAt + PET_DURATION).getTime()) || value.startedAt > value.observedAt || value.observedAt - value.startedAt > PET_DURATION) return null;
    return {observedAt:value.observedAt, startedAt:value.startedAt, alerted:value.alerted === true, clockChanged:value.clockChanged === true};
  }
  function petTiming(pet, now) {
    if (!pet) return null;
    const end = pet.startedAt + PET_DURATION, warnAt = end - PET_WARNING;
    const stage = pet.clockChanged || now < pet.observedAt ? 'uncertain' : now >= end ? 'expired' : now >= warnAt ? 'soon' : 'active';
    return {end, warnAt, remaining:Math.max(0, (end - now) / 1000), stage, needsReview:stage !== 'active'};
  }
  function petMarchReview(pet, confirmedAt, now) {
    const timing=petTiming(pet,now);
    if(!timing?.needsReview)return false;
    if(timing.stage==='uncertain')return true;
    return !Number.isFinite(confirmedAt)||confirmedAt<(timing.stage==='expired'?timing.end:timing.warnAt);
  }
  const api = {parseDuration, formatMinutesSeconds, makeRallyPlan, adjustRallyPlan, rallyGaps, rallyTiming, recordEnemy, enemyCountdown, adjustEnemy, guardWindows, nextWindow, reinforcementBoosts, timelineRange, battleTimeline, nextRallyInstruction, formatUtc, rallyShareText, makePetEstimate, restorePetEstimate, petTiming, petMarchReview};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KingshotTiming = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
