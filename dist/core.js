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
    if (!rows.length) throw new TimingError('noLeaders');
    const parsed = rows.map((r, i) => {
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
  function recordEnemy(row, now) {
    const prepare = row.mode === 'marching' ? 0 : parseDuration(row.prepare);
    const march = parseDuration(row.march, false);
    return {id: row.id, name: row.name.trim(), recordedAt: now, arrivalAt: now + (prepare + march) * 1000};
  }
  function guardWindows(records, ownMarch, margin) {
    const own = parseDuration(ownMarch, false) * 1000;
    const pad = parseDuration(margin) * 1000;
    const sorted = [...records].sort((a, b) => a.arrivalAt - b.arrivalAt);
    return sorted.slice(0, -1).map((a, i) => {
      const b = sorted[i + 1];
      const arrivalStart = a.arrivalAt + pad;
      const arrivalEnd = b.arrivalAt - pad;
      const start = arrivalStart - own;
      const end = arrivalEnd - own;
      return {id: `${a.id}:${b.id}:${a.arrivalAt}:${b.arrivalAt}`, before: a, after: b, arrivalStart, arrivalEnd, start, end, midpoint: (start + end) / 2, width: (end - start) / 1000, usable: arrivalEnd > arrivalStart};
    });
  }
  function nextWindow(windows, now) { return windows.find(w => w.usable && w.end > now) || null; }
  function nextRallyInstruction(rows, now) {
    const recent = [...rows].reverse().find(r => r.launchAt <= now);
    if (recent && now - recent.launchAt < 1200) return recent;
    return rows.find(r => r.launchAt > now) || null;
  }
  const api = {parseDuration, makeRallyPlan, recordEnemy, guardWindows, nextWindow, nextRallyInstruction};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KingshotTiming = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
