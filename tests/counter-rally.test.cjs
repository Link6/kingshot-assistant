const {test}=require('node:test'),assert=require('node:assert/strict'),K=require('../dist/core.js');
const leader={id:'our',name:'Our leader',prepare:300,march:30,enabled:false};
const enemy={id:'enemy',name:'Enemy',arrivalAt:400000,recordedAt:50000,revision:1};
test('counter rallies work backwards from a selected enemy and retain disabled leader details',()=>{
 const r=K.makeCounterRally(leader,enemy,10000,{offset:1});
 assert.equal(r.targetAt,401000);assert.equal(r.launchAt,71000);assert.equal(r.arrivalAt,401000);assert.equal(r.offset,1);
 assert.equal(r.leaderId,'our');assert.equal(leader.enabled,false);assert.equal(K.counterStatus(r,[enemy],10000,[leader]).ready,true);
});
test('too-late fresh rallies fail; already gathering or marching accept actual game readings',()=>{
 assert.throws(()=>K.makeCounterRally(leader,enemy,100000),{code:'counterTooLate'});
 const gathering=K.makeCounterRally(leader,enemy,100000,{mode:'gathering',remaining:270});
 assert.equal(gathering.arrivalAt,400000);assert.equal(gathering.confirmed,true);assert.equal(K.counterStatus(gathering,[enemy],100000).drift,-1);
 const marching=K.makeCounterRally(leader,enemy,390000,{mode:'marching',remaining:10});
 assert.equal(marching.arrivalAt,400000);assert.equal(K.rallyTiming(marching,390000).stage,'marching');
});
test('actual launch and readings change only the selected row and preserve original plan',()=>{
 const r=K.makeCounterRally(leader,enemy,10000),before=structuredClone(r);
 const launched=K.adjustCounterRally(r,{mode:'launch'},73000);assert.equal(launched.arrivalAt,403000);assert.equal(launched.plannedLaunchAt,71000);assert.equal(launched.confirmed,true);
 const reading=K.adjustCounterRally(launched,{mode:'gathering',remaining:100},300000);assert.equal(reading.arrivalAt,430000);
 const marching=K.adjustCounterRally(reading,{mode:'marching',remaining:9.5},420000);assert.equal(marching.arrivalAt,429500);
 assert.deepEqual(r,before);
 for(let i=0,row=r;i<10;i++){row=K.adjustCounterRally(row,{delta:0.1},10000);if(i===9)assert.equal(row.launchAt,72000);}
});
test('changed, stopped or re-recorded reference attacks pause launch cues without moving actual progress',()=>{
 const r=K.makeCounterRally(leader,enemy,10000),launch=r.launchAt;
 for(const e of [{...enemy,arrivalAt:401000},{...enemy,revision:2},{...enemy,recordedAt:60000},{...enemy,active:false}]){
  const s=K.counterStatus(r,[e],20000,[leader]);assert.equal(s.sourceChanged,true);assert.equal(s.ready,false);assert.equal(r.launchAt,launch);
 }
 assert.equal(K.counterStatus(r,[],20000).ready,false);
});
test('leader changes, deletion and missed launch require review; confirmed timing continues',()=>{
 const r=K.makeCounterRally(leader,enemy,10000);
 for(const leaders of [[{...leader,march:31}],[{...leader,prepare:60}],[]])assert.equal(K.counterStatus(r,[enemy],20000,leaders).ready,false);
 assert.equal(K.counterStatus(r,[enemy],r.launchAt+1201,[leader]).missed,true);
 assert.equal(K.counterStatus({...r,confirmed:true},[enemy],r.launchAt+1201,[leader]).missed,false);
 assert.equal(K.counterStatus({...r,cancelled:true},[enemy],20000,[leader]).ready,false);
});
test('later enemy waves are surfaced without silently changing the chosen reference',()=>{
 const r=K.makeCounterRally(leader,enemy,10000,{offset:3}),next={...enemy,id:'next',arrivalAt:402000};
 const s=K.counterStatus(r,[enemy,next],20000);assert.equal(s.nextThreat.id,'next');assert.equal(s.desiredAt,403000);assert.equal(s.ready,true);
});
test('counter time axis includes gathering, march, launch, impact and target on one clock',()=>{
 const r=K.makeCounterRally(leader,enemy,10000),segments=K.counterSegments(r);
 assert.deepEqual(segments.map(s=>s.kind),['gather','march','launch','counter','target']);
 assert.equal(segments[0].end,371000);assert.equal(segments[1].end,401000);assert.equal(segments[4].start,401000);
 assert.equal(K.timelineRange(segments[1].start,segments[1].end,380000,30000).width,70);
});
test('counter readings, offsets, cancelled rows and stale or invalid enemies are bounded',()=>{
 for(const offset of [0,-1,3601,'NaN'])assert.throws(()=>K.makeCounterRally(leader,enemy,10000,{offset}));
 for(const [mode,remaining] of [['gathering',301],['marching',31],['marching',-1],['bad',0]])assert.throws(()=>K.makeCounterRally(leader,enemy,10000,{mode,remaining}));
 assert.throws(()=>K.makeCounterRally(leader,{...enemy,active:false},10000),{code:'counterEnemyMissing'});
 const r=K.makeCounterRally(leader,enemy,10000);assert.throws(()=>K.adjustCounterRally({...r,cancelled:true},{delta:1},10000));assert.throws(()=>K.adjustCounterRally(r,{delta:10},10000));
});
