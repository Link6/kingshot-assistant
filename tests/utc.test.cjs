const {test}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const K=require('../dist/core.js');
const I=require('../dist/i18n.js');
const labels=()=>({leader:n=>I.t('leaderName',{n})});
test('UTC display stays identical across device timezones, including midnight and fractional seconds',()=>{
  const time=Date.parse('2026-10-14T00:00:00.125Z');
  for(const TZ of ['Asia/Shanghai','America/Los_Angeles','UTC']){
    const result=execFileSync(process.execPath,['-e',`const K=require('./dist/core.js');process.stdout.write(K.formatUtc(${time}));`],{cwd:require('node:path').join(__dirname,'..'),env:{...process.env,TZ},encoding:'utf8'});
    assert.equal(result,'2026-10-14 00:00:00.125 UTC');
  }
  assert.equal(K.formatUtc(time,false),'2026-10-14 00:00:00 UTC');
});
test('shared plan shows whole UTC seconds across midnight while preserving internal precision',()=>{
  I.setLanguage('en');
  const plan=K.makeRallyPlan([{id:'a',name:'A',prepare:'60',march:'30.5'},{id:'b',name:'B',prepare:'0',march:'5'}],Date.parse('2026-10-13T23:59:00Z'),{target:Date.parse('2026-10-14T00:01:00Z')});
  const original=JSON.stringify(plan);
  assert.equal(K.rallyShareText(plan,labels()),'A 23:59:29 UTC\nB 00:00:55 UTC');
  assert.equal(JSON.stringify(plan),original);
  assert.equal(plan.rows[0].launchAt%1000,500);
});
test('export preserves the active plan, localizes default names, and keeps one line per leader',()=>{
  const rows=[{id:'a',name:'',prepare:'0',march:'5'},{id:'b',name:' Team\nB ',prepare:'60',march:'5'}];
  const plan=K.makeRallyPlan(rows,0);const original=JSON.stringify(plan);
  rows[0].name='Edited draft';
  I.setLanguage('en');const en=K.rallyShareText(plan,labels());
  assert.ok(en.startsWith('Team B 00:00:10 UTC\nLeader 1 00:01:10 UTC'));assert.ok(!en.includes('Edited draft'));
  I.setLanguage('zh-CN');assert.ok(K.rallyShareText(plan,labels()).includes('\n车头 1 00:01:10 UTC'));
  assert.equal(JSON.stringify(plan),original);assert.equal(K.rallyShareText(null,labels()),'');
});
