const {test}=require('node:test'),assert=require('node:assert/strict'),K=require('../dist/core.js');
test('late launch calibration shifts only one leader, preserves original schedule and reorders landings',()=>{
 const p=K.makeRallyPlan([{id:'a',name:'A',prepare:30,march:20},{id:'b',name:'B',prepare:20,march:10}],1000);
 const changed=K.adjustRallyPlan(p,'a',{delta:1});
 assert.equal(changed.rows.find(r=>r.id==='a').arrivalAt,p.target+1000);
 assert.equal(changed.rows.find(r=>r.id==='b').arrivalAt,p.target);
 assert.equal(p.rows[0].confirmed,undefined);
 const again=K.adjustRallyPlan(changed,'a',{delta:0.1});
 assert.equal(again.rows.find(r=>r.id==='a').plannedLaunchAt,p.rows.find(r=>r.id==='a').launchAt);
 const gaps=K.rallyGaps(again.rows);
 assert.equal(gaps[0].before.id,'b');assert.equal(gaps[0].width,1.1);assert.equal(gaps[0].safeWidth,1.1);
 assert.equal(gaps[0].start,gaps[0].before.arrivalAt);assert.equal(gaps[0].end,gaps[0].after.arrivalAt);
});
test('exact actual launch propagates to preparation, marching and arrival without restarting other leaders',()=>{
 const p=K.makeRallyPlan([{id:'a',name:'A',prepare:30,march:20}],1000);
 const changed=K.adjustRallyPlan(p,'a',{at:1250});const r=changed.rows[0];
 assert.equal(r.arrivalAt,51250);assert.equal(K.rallyTiming(r,2000).stage,'gathering');
 assert.equal(K.rallyTiming(r,31250).stage,'marching');assert.equal(K.rallyTiming(r,51250).stage,'arrived');
 assert.equal(K.rallyTiming(r,1000).remaining,0.25);
 assert.throws(()=>K.adjustRallyPlan(p,'a',{at:NaN}));assert.throws(()=>K.adjustRallyPlan(p,'a',{delta:5}));
});
test('attack gaps preserve every positive interval while defense can still apply margins',()=>{
 const rows=[{id:'a',arrivalAt:1000},{id:'b',arrivalAt:1000},{id:'c',arrivalAt:1400}];
 const full=K.rallyGaps(rows);assert.equal(full[0].usable,false);assert.equal(full[1].usable,true);assert.equal(full[1].safeWidth,0.4);assert.equal(full[1].start,1000);assert.equal(full[1].end,1400);
 const defense=K.rallyGaps(rows,0.2);assert.ok(defense.every(g=>!g.usable&&g.safeWidth===0));
 assert.deepEqual(rows.map(r=>r.id),['a','b','c']);
});
