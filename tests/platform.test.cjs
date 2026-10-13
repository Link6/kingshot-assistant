const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const I=require('../dist/i18n.js');
const K=require('../dist/core.js');
const {AlarmQueue}=require('../electron/alarms.cjs');
test('both languages contain all translations and matching placeholders',()=>{
  for(const [key,[zh,en]] of Object.entries(I.catalogue)){
    assert.ok(zh&&en,key);
    assert.deepEqual([...zh.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),[...en.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),key);
  }
  const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
  for(const m of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g))assert.ok(I.catalogue[m[1]],m[1]);
});
test('locale selection, interpolation and language changes do not alter timing data',()=>{
  assert.equal(I.choose('zh-TW'),'zh-CN');assert.equal(I.choose('en-US'),'en');assert.equal(I.choose('ko'),'en');
  const plan=K.makeRallyPlan([{id:'a',name:'玩家一',prepare:'5 min',march:'35s'}],1000);
  const original=JSON.stringify(plan);
  I.setLanguage('en');assert.equal(I.t('leaderName',{n:2}),'Leader 2');
  I.setLanguage('zh-CN');assert.equal(I.t('leaderName',{n:2}),'车头 2');assert.equal(JSON.stringify(plan),original);
});
test('English and Chinese units represent the same durations',()=>{
  for(const [a,b] of [['4m 40s','4分40秒'],['4min40s','4:40'],['1h 2min 3s','1:02:03'],['29.5s','29.5秒']])assert.equal(K.parseDuration(a),K.parseDuration(b));
  for(const bad of ['ms','3minutes?','4m -2s','3,5','1h2h'])assert.throws(()=>K.parseDuration(bad));
});
test('desktop alerts fire once, preserve deduplication across language changes and never replay missed cues',()=>{
  const q=new AlarmQueue(),e={id:'a',at:1000,expiresAt:5000,title:'Send now',body:'A'};
  q.replace([e]);assert.deepEqual(q.due(999),[]);assert.equal(q.due(1000).length,1);
  q.replace([{...e,title:'现在出征'}]);assert.deepEqual(q.due(1010),[]);
  q.clear();q.replace([e]);assert.deepEqual(q.due(4000),[]);
  q.replace([{...e,id:'b',at:8000,expiresAt:8500}]);assert.deepEqual(q.due(8600),[]);
});
test('desktop alarm IPC data is bounded and validated',()=>{
  const q=new AlarmQueue();assert.throws(()=>q.replace({}));assert.throws(()=>q.replace([{id:'a',at:NaN,expiresAt:1,title:'x',body:''}]));
  assert.throws(()=>q.replace(Array(61).fill({id:'a',at:1,expiresAt:2,title:'x',body:''})));
});
