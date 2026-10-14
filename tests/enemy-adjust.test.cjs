const {test}=require('node:test');
const assert=require('node:assert/strict');
const {recordEnemy,enemyCountdown,adjustEnemy,guardWindows}=require('../dist/core.js');
const row={id:'a',name:'A',mode:'gathering',prepare:'10',march:'35'};
test('recording counts down gathering then marching at the exact phase boundary',()=>{
  const record=recordEnemy(row,100000);
  assert.deepEqual(enemyCountdown(record,102500),{prepare:7.5,march:35,stage:'gathering'});
  assert.deepEqual(enemyCountdown(record,110000),{prepare:0,march:35,stage:'marching'});
  assert.deepEqual(enemyCountdown(record,111100),{prepare:0,march:33.9,stage:'marching'});
  assert.deepEqual(enemyCountdown(record,145000),{prepare:0,march:0,stage:'arrived'});
  assert.deepEqual(enemyCountdown(record,146000),{prepare:0,march:0,stage:'arrived'});
});
test('fine adjustments preserve elapsed time and other enemy records, and update reinforcement windows',()=>{
  const a=recordEnemy(row,100000),b=recordEnemy({...row,id:'b',march:'40'},100000);
  const adjusted=adjustEnemy(a,'prepare',1,103000);
  assert.equal(adjusted.recordedAt,100000);
  assert.equal(adjusted.departAt,111000);
  assert.deepEqual(enemyCountdown(adjusted,103000),{prepare:8,march:35,stage:'gathering'});
  const final=adjustEnemy(adjusted,'march',-0.1,104000);
  assert.equal(final.departAt,111000);
  assert.equal(final.arrivalAt,145900);
  assert.equal(final.marchSeconds,34.9);
  assert.equal(a.arrivalAt,145000);
  assert.equal(b.arrivalAt,150000);
  const before=guardWindows([a,b],'29','0.2')[0],after=guardWindows([final,b],'29','0.2')[0];
  assert.equal(after.start-before.start,900);
  assert.equal(after.end,before.end);
  assert.equal(after.width,3.7);
});
test('marching recording and adjustments use current remaining time without restarting',()=>{
  const a=recordEnemy({...row,mode:'marching',prepare:'invalid',march:'20'},100000);
  const b=adjustEnemy(a,'march',1,105000);
  assert.deepEqual(enemyCountdown(b,105000),{prepare:0,march:16,stage:'marching'});
  assert.throws(()=>adjustEnemy(a,'prepare',1,105000),{code:'prepareEnded'});
});
test('adjustments guard zero bounds, phase expiry and reject invalid buttons without mutation',()=>{
  const a=recordEnemy(row,100000);
  assert.throws(()=>adjustEnemy(a,'prepare',-1,109500),{code:'adjustBelowZero'});
  assert.throws(()=>adjustEnemy(a,'prepare',1,110000),{code:'prepareEnded'});
  assert.throws(()=>adjustEnemy(a,'bad',1,100000));
  assert.throws(()=>adjustEnemy(a,'march',Infinity,100000));
  assert.throws(()=>adjustEnemy(recordEnemy({...row,march:'0.1'},100000),'march',-0.1,100000));
  assert.equal(a.arrivalAt,145000);
});
test('repeated tenths do not accumulate timestamp drift and re-recording replaces corrections',()=>{
  let a=recordEnemy(row,100000);
  for(let i=0;i<100;i++)a=adjustEnemy(a,'march',0.1,105000);
  assert.equal(a.arrivalAt,155000);assert.equal(a.marchSeconds,45);
  const fresh=recordEnemy({...row,prepare:'5'},106000);
  assert.equal(fresh.arrivalAt,146000);
  assert.equal(fresh.recordedAt,106000);
});
