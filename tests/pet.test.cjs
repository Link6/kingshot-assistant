const {test}=require('node:test');
const assert=require('node:assert/strict');
const K=require('../dist/core.js');
const {AlarmQueue}=require('../electron/alarms.cjs');
const now=Date.parse('2026-10-14T10:00:00Z');
test('pet estimates last two hours and enter the reminder at exactly five minutes remaining',()=>{
  const pet=K.makePetEstimate('0',now),end=now+7200000;
  assert.equal(K.petTiming(pet,now).remaining,7200);
  assert.equal(K.petTiming(pet,end-300001).stage,'active');
  assert.equal(K.petTiming(pet,end-300000).stage,'soon');
  assert.equal(K.petTiming(pet,end-1).stage,'soon');
  assert.equal(K.petTiming(pet,end).stage,'expired');
  assert.equal(K.petTiming(pet,end+1).remaining,0);
  assert.equal(K.petTiming(pet,end).needsReview,true);
});
test('estimated elapsed minutes shift only that pet and do not alter recorded attacks',()=>{
  const a=K.makePetEstimate('116',now),b=K.makePetEstimate('0',now);
  assert.equal(K.petTiming(a,now).remaining,240);
  assert.equal(K.petTiming(b,now).remaining,7200);
  const row={id:'a',name:'A',mode:'gathering',prepare:'60',march:'35',pet:a};
  const record=K.recordEnemy(row,now),updated=K.makePetEstimate('119.5',now+1000);
  row.pet=updated;
  assert.equal(record.arrivalAt,now+95000);
  assert.equal(K.petTiming(updated,now+1000).remaining,30);
  K.recordEnemy(row,now+10000);
  assert.equal(updated.startedAt,now+1000-119.5*60000);
  assert.equal(K.petTiming(b,now).remaining,7200);
});
test('saved pet estimates retain absolute deadlines and warning state across reload and sleep',()=>{
  const pet={...K.makePetEstimate('10',now),alerted:true};
  const restored=K.restorePetEstimate(JSON.parse(JSON.stringify(pet)));
  assert.equal(K.petTiming(restored,now+3600000).remaining,3000);
  assert.equal(K.petTiming(restored,now+7200000).stage,'expired');
  assert.equal(restored.alerted,true);
  assert.equal(K.petTiming(restored,now-1).stage,'uncertain');
  assert.equal(K.petTiming({...restored,clockChanged:true},now+1000).stage,'uncertain');
});
test('invalid elapsed inputs and malformed saved estimates are rejected',()=>{
  for(const value of ['',-1,'121','abc',Infinity,'2h'])assert.throws(()=>K.makePetEstimate(value,now),{code:'petElapsedInvalid'});
  assert.equal(K.petTiming(K.makePetEstimate('120',now),now).stage,'expired');
  for(const value of [null,{}, {observedAt:now,startedAt:now+1},{observedAt:now,startedAt:now-7200001},{observedAt:1e100,startedAt:1e100}])assert.equal(K.restorePetEstimate(value),null);
});
test('desktop supports sixty pet timers plus thirty rally alarms and fires reminders once',()=>{
  const q=new AlarmQueue(),pet=K.petTiming(K.makePetEstimate('0',now),now);
  const events=Array.from({length:60},(_,i)=>({id:'pet:'+i,at:pet.warnAt,expiresAt:pet.end,title:'Check march time',body:'Leader '+i}));
  events.push(...Array.from({length:30},(_,i)=>({id:'rally:'+i,at:pet.end+10000,expiresAt:pet.end+11000,title:'Launch',body:''})));
  q.replace(events);assert.equal(q.due(pet.warnAt-1).length,0);assert.equal(q.due(pet.warnAt).length,60);
  q.replace(events.map(e=>({...e,title:'核对行军时间'})));assert.equal(q.due(pet.warnAt+1).length,0);
  q.replace([]);assert.equal(q.due(pet.end).length,0);
});

test('rally schedules do not restart pet estimates and changing a pet does not change launch times',()=>{
  const pet=K.makePetEstimate('116',now);
  const row={id:'a',name:'A',prepare:'60',march:'35',pet};
  const first=K.makeRallyPlan([row],now,{lead:'10'});
  row.pet=K.makePetEstimate('110',now);
  const second=K.makeRallyPlan([row],now,{lead:'10'});
  assert.equal(first.rows[0].launchAt,second.rows[0].launchAt);
  assert.equal(first.target,second.target);
  const startedAt=row.pet.startedAt;
  K.makeRallyPlan([row],now+1000,{lead:'10'});
  assert.equal(row.pet.startedAt,startedAt);
});
