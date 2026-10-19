const {test}=require('node:test'),assert=require('node:assert/strict'),K=require('../dist/core.js');
test('stopped enemy records never contribute to reinforcement windows or rolling attack tracks',()=>{
 const a={id:'a',arrivalAt:100000},b={id:'b',arrivalAt:103000,active:false},c={id:'c',arrivalAt:108000};
 const windows=K.guardWindows([b,c,a],20,0.2);
 assert.equal(windows.length,1);assert.equal(windows[0].before.id,'a');assert.equal(windows[0].after.id,'c');assert.equal(windows[0].width,7.6);
 assert.deepEqual(K.battleTimeline([b,c,a],windows,90000).attacks.map(a=>a.record.id),['a','c']);
 assert.equal(b.active,false);
 assert.equal(K.guardWindows([a,b],20,0.2).length,0);
});
test('recording a fresh countdown after cancellation uses the new observation time',()=>{
 const row={id:'a',name:'A',mode:'gathering',prepare:300,march:30};
 const original=K.recordEnemy(row,1000),again=K.recordEnemy({...row,prepare:280},61000);
 assert.equal(original.arrivalAt,331000);assert.equal(again.arrivalAt,371000);assert.equal(again.recordedAt,61000);assert.equal(again.id,original.id);
});
