const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parseDuration, makeRallyPlan, recordEnemy, guardWindows, nextWindow, nextRallyInstruction} = require('../dist/core.js');
test('accept game duration formats and reject ambiguous or invalid readings', () => {
  for (const [input, expected] of [['4:40',280],['280',280],['4分40秒',280],['29.5秒',29.5],['1:02:03',3723],['0',0]]) assert.equal(parseDuration(input),expected);
  for (const input of ['', '-1', '4:60', '1:99:00', 'NaN', 'Infinity', '5abc', '604801']) assert.throws(() => parseDuration(input));
  assert.throws(() => parseDuration('0',false));
});
test('different preparation and marching times lead to one arrival, longest total starts first', () => {
  const now = 100000;
  const plan = makeRallyPlan([{id:1,name:'A',prepare:'5:00',march:'35'},{id:2,name:'B',prepare:'1:00',march:'50'},{id:3,name:'C',prepare:'5:00',march:'20'}],now,{lead:10});
  assert.equal(plan.target,445000);
  assert.deepEqual(plan.rows.map(r=>r.id),[1,3,2]);
  assert.equal(plan.rows[0].launchAt,now+10000);
  for (const r of plan.rows) assert.equal(r.launchAt+(r.prepareSeconds+r.marchSeconds)*1000,plan.target);
});
test('reject impossible target or incomplete inputs without generating a plan', () => {
  const rows=[{name:'A',prepare:'5:00',march:'35'}];
  assert.throws(()=>makeRallyPlan(rows,100000,{target:435000}),{code:'tooLate'});
  assert.throws(()=>makeRallyPlan(rows,100000,{target:NaN}));
  assert.throws(()=>makeRallyPlan([{name:'A',prepare:'5:00',march:''}],100000));
});
test('enemy snapshot updates one record only, marching ignores stale preparation', () => {
  const row={id:'a',name:'A',mode:'gathering',prepare:'4:40',march:'35'};
  const first=recordEnemy(row,100000);
  const other=recordEnemy({...row,id:'b'},101000);
  const updated=recordEnemy({...row,prepare:'4:30'},105000);
  assert.equal(first.arrivalAt,415000);
  assert.equal(updated.arrivalAt,410000);
  assert.equal(other.arrivalAt,416000);
  assert.equal(recordEnemy({...row,mode:'marching',prepare:'invalid',march:'20'},200000).arrivalAt,220000);
  assert.throws(()=>recordEnemy({...row,march:''},100000));
});
test('3 second gap with 0.2 second margins leaves 2.6 seconds, shift by own travel', () => {
  const records=[{id:'b',name:'B',arrivalAt:103000},{id:'a',name:'A',arrivalAt:100000}];
  const [w]=guardWindows(records,'29','0.2');
  assert.equal(w.width,2.6);
  assert.equal(w.start,71200);
  assert.equal(w.end,73800);
  assert.equal(w.midpoint,72500);
  assert.equal(w.before.id,'a');
  assert.equal(records[0].id,'b');
  assert.equal(nextWindow([w],73000),w);
  assert.equal(nextWindow([w],73800),null);
});
test('equal arrivals and gap exactly equal to combined margins have no safe window', () => {
  for (const gap of [0,300,400]) {
    const [w]=guardWindows([{id:'a',arrivalAt:100000},{id:'b',arrivalAt:100000+gap}],'29','0.2');
    assert.equal(w.usable,false);
    assert.equal(nextWindow([w],0),null);
  }
});
test('closely spaced launches switch immediately to the newly due head', () => {
  const rows=[{id:'a',launchAt:10000},{id:'b',launchAt:11000},{id:'c',launchAt:11100},{id:'d',launchAt:20000}];
  assert.equal(nextRallyInstruction(rows,9000).id,'a');
  assert.equal(nextRallyInstruction(rows,10050).id,'a');
  assert.equal(nextRallyInstruction(rows,11050).id,'b');
  assert.equal(nextRallyInstruction(rows,11150).id,'c');
  assert.equal(nextRallyInstruction(rows,13000).id,'d');
  assert.equal(nextRallyInstruction(rows,22000),null);
});
