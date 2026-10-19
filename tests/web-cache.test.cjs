const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const {prepareAssets}=require('../scripts/prepare-web-assets.cjs');
const root=path.join(__dirname,'../dist');
const source=fs.readFileSync(path.join(root,'sw.js'),'utf8');

function worker({offline=false,status=200,staleHtml=false}={}){
  const handlers={},calls=[],deleted=[];
  const scope='https://example.com/kingshot-assistant/';
  const snapshot={name:'complete offline snapshot',text:async()=>staleHtml?'<html>Old build</html>':fs.readFileSync(path.join(root,'index.html'),'utf8')},network={ok:status===200,status,name:'new document'};
  const cache={addAll:async requests=>calls.push({install:requests}),match:async request=>String(request.url||request).endsWith('/index.html')?snapshot:undefined};
  class Request{
    constructor(input,init={}){this.url=String(input.url||input);this.method=input.method||'GET';this.mode=input.mode||'cors';Object.assign(this,init);}
  }
  const context={URL,Request,Response,Set,self:{registration:{scope},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},
    caches:{open:async()=>cache,keys:async()=>['kingshot:'+scope+':old','another-project:keep'],delete:async key=>deleted.push(key)},
    fetch:async request=>{calls.push({request});if(offline)throw Error('offline');return network;}};
  vm.runInNewContext(source,context);
  async function fetchPage(){let result;handlers.fetch({request:{url:scope,method:'GET',mode:'navigate'},respondWith:promise=>result=promise});return result;}
  return {handlers,calls,deleted,scope,snapshot,network,cache,fetchPage};
}

test('HTML and precache reference the same content-addressed scripts and stylesheet',()=>{
  const {assets}=prepareAssets({check:true});
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.equal(assets.length,8);
  for(const asset of assets){
    const match=asset.match(/^\.\/assets\/(\w+)-([a-f0-9]{16})\.(js|css)$/);assert.ok(match);
    const [,base,hash,ext]=match;
    const text=fs.readFileSync(path.join(root,base+'.'+ext),'utf8').replace(/\r\n/g,'\n');
    assert.equal(hash,createHash('sha256').update(text).digest('hex').slice(0,16));
    assert.equal(fs.readFileSync(path.join(root,asset),'utf8').replace(/\r\n/g,'\n'),text);
    assert.ok(html.includes('"'+asset.slice(2)+'"'));assert.ok(source.includes("'"+asset+"'"));
  }
  assert.doesNotMatch(html,/(?:src|href)="(?:app|i18n|install|core)\.js"|href="styles\.css"/);
});

test('every generated browser script compiles before deployment',()=>{
  for(const asset of prepareAssets({check:true}).assets.filter(p=>p.endsWith('.js'))){
    assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,asset),'utf8'),{filename:asset}));
  }
});

test('installation bypasses the HTTP cache for every file in the offline snapshot',async()=>{
  const w=worker();let pending;w.handlers.install({waitUntil:p=>pending=p});await pending;
  const requests=w.calls[0].install;assert.ok(requests.length>5);
  assert.ok(requests.every(r=>r.cache==='reload'&&r.url.startsWith(w.scope)));
});

test('a mismatched CDN HTML response cannot activate an incomplete offline build',async()=>{
  const w=worker({staleHtml:true});let pending;w.handlers.install({waitUntil:p=>pending=p});
  await assert.rejects(pending,/different builds/);
});

test('ordinary navigation fetches fresh HTML and never overwrites a complete offline snapshot',async()=>{
  const w=worker();assert.equal(await w.fetchPage(),w.network);
  assert.equal(w.calls[0].request.cache,'no-store');
  assert.equal(await w.cache.match(w.scope+'index.html'),w.snapshot);
});

test('offline navigation and temporary server failures restore the matching cached HTML',async()=>{
  for(const options of [{offline:true},{status:503}]){
    const w=worker(options);assert.equal(await w.fetchPage(),w.snapshot);
  }
});

test('a worker from an older build leaves new content-addressed assets to the network',()=>{
  const w=worker();let intercepted=false;
  w.handlers.fetch({request:{url:w.scope+'assets/app-0000000000000000.js',method:'GET',mode:'cors'},respondWith:()=>intercepted=true});
  assert.equal(intercepted,false);
});

test('cache cleanup remains confined to this project scope',async()=>{
  const w=worker();let pending;w.handlers.activate({waitUntil:p=>pending=p});await pending;
  assert.deepEqual(w.deleted,['kingshot:'+w.scope+':old']);
});
