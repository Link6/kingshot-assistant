const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/install.js'),'utf8');
function setup(options={}){
  const elements=new Map(),windowEvents=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:true,textContent:'',disabled:false,handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},focus(){this.focused=true;},scrollIntoView(){}});return elements.get(id);};
  const display={matches:!!options.standalone,addEventListener(_,fn){this.changed=fn;}};
  const window={kingshotDesktop:options.desktop,KingshotI18n:{t:key=>`${options.language||'zh'}:${key}`},addEventListener:(k,v)=>windowEvents.set(k,v)};
  const document={hidden:false,getElementById:element,addEventListener(){}};
  const navigator={userAgent:options.ua??'Mozilla/5.0 (Linux; Android 15) Chrome/130',platform:options.platform||'',maxTouchPoints:options.touch||0,standalone:options.navigatorStandalone};
  vm.runInNewContext(source,{window,document,navigator,location:{protocol:options.protocol||'https:'},matchMedia:()=>display,queueMicrotask});
  return {element,display,window,fire:(type,event)=>windowEvents.get(type)?.(event),click:id=>element(id).handlers.click?.()};
}
function nativePrompt({error=false}={}){
  let resolve,reject;
  const event={prevented:false,calls:0,userChoice:new Promise((yes,no)=>{resolve=yes;reject=no;}),preventDefault(){this.prevented=true;},prompt(){this.calls++;return error?Promise.reject(Error('unavailable')):Promise.resolve();}};
  return {event,choose:outcome=>resolve({outcome}),reject};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('page load leaves native installation promotion enabled and does not show a custom banner',()=>{
  for(const ua of ['Android Chrome','Windows Chrome','iPhone Safari']){
    const app=setup({ua}),prompt=nativePrompt();
    assert.equal(app.element('install-banner').hidden,true);
    app.fire('beforeinstallprompt',prompt.event);
    assert.equal(prompt.event.prevented,false);
    assert.equal(prompt.event.calls,0);
    assert.equal(app.element('install-banner').hidden,true);
    assert.equal(app.element('install-entry').hidden,false);
    assert.equal(app.element('install-entry').textContent,'zh:installNow');
  }
});

test('install button synchronously invokes the native prompt once, on Android and desktop',async()=>{
  for(const ua of ['Android Chrome','Windows Chrome']){
    const app=setup({ua}),prompt=nativePrompt();app.fire('beforeinstallprompt',prompt.event);
    const click=app.click('install-entry');
    assert.equal(prompt.event.calls,1,'prompt must run before yielding the click handler');
    await app.click('install-entry');assert.equal(prompt.event.calls,1);
    assert.equal(app.element('install-banner').hidden,true);
    prompt.choose('accepted');await click;
    assert.equal(app.element('install-entry').hidden,true);
    assert.equal(app.element('install-banner').hidden,true);
  }
});

test('browser-owned prompts can complete without an app button click',async()=>{
  for(const outcome of ['accepted','dismissed']){
    const app=setup(),prompt=nativePrompt();app.fire('beforeinstallprompt',prompt.event);
    prompt.choose(outcome);await tick();
    assert.equal(prompt.event.calls,0);
    assert.equal(app.element('install-banner').hidden,true);
    assert.equal(app.element('install-entry').hidden,outcome==='accepted');
    if(outcome==='dismissed'){
      assert.equal(app.element('install-entry').textContent,'zh:installHelp');
      await app.click('install-entry');assert.equal(prompt.event.calls,0,'do not reuse a browser-consumed event');
    }
  }
});

test('native dismissal does not show a replacement banner or block a later browser event',async()=>{
  const app=setup(),first=nativePrompt();app.fire('beforeinstallprompt',first.event);
  const click=app.click('install-entry');first.choose('dismissed');await click;
  assert.equal(app.element('install-banner').hidden,true);
  const next=nativePrompt();app.fire('beforeinstallprompt',next.event);
  assert.equal(next.event.prevented,false);
  const again=app.click('install-entry');assert.equal(next.event.calls,1);next.choose('accepted');await again;
});

test('late results from older events do not discard a newer install opportunity',async()=>{
  const app=setup(),first=nativePrompt(),next=nativePrompt();
  app.fire('beforeinstallprompt',first.event);app.fire('beforeinstallprompt',next.event);
  first.choose('dismissed');await tick();
  assert.equal(app.element('install-entry').textContent,'zh:installNow');
  const click=app.click('install-entry');assert.equal(next.event.calls,1);next.choose('accepted');await click;
});

test('manual help opens only on request, closes accessibly, and supports language changes',async()=>{
  for(const [options,key] of [[{ua:'iPhone Safari'},'installIOS'],[{ua:'Macintosh Safari',platform:'MacIntel',touch:5},'installIOS'],[{ua:'iPhone MicroMessenger'},'installEmbedded'],[{},'installAndroid']]){
    const app=setup(options);assert.equal(app.element('install-banner').hidden,true);
    await app.click('install-entry');assert.equal(app.element('install-help').textContent,'zh:'+key);
    assert.equal(app.element('install-banner').hidden,false);
    app.window.KingshotI18n.t=key=>'en:'+key;
    app.element('language-select').handlers.change();await tick();
    assert.equal(app.element('install-help').textContent,'en:'+key);
    app.click('install-dismiss');assert.equal(app.element('install-banner').hidden,true);
    assert.equal(app.element('install-entry').focused,true);
  }
});

test('Electron, local files and installed apps hide installation controls',()=>{
  for(const options of [{desktop:{}},{protocol:'file:'},{standalone:true},{navigatorStandalone:true}]){
    const app=setup(options);assert.equal(app.element('install-banner').hidden,true);assert.equal(app.element('install-entry').hidden,true);
  }
  const app=setup();app.display.matches=true;app.display.changed();assert.equal(app.element('install-entry').hidden,true);
  const desktop=setup({ua:'Windows Chrome'});assert.equal(desktop.element('install-entry').hidden,true);
});

test('failed or rejected native prompts recover without reusing the event',async()=>{
  const app=setup({ua:'Windows Chrome'}),prompt=nativePrompt({error:true});
  app.fire('beforeinstallprompt',prompt.event);await app.click('install-entry');
  assert.equal(app.element('install-help').textContent,'zh:installDesktop');
  assert.equal(app.element('install-banner').hidden,false);assert.equal(app.element('install-entry').disabled,false);
  await app.click('install-entry');assert.equal(prompt.event.calls,1);
  prompt.reject(Error('unavailable'));await tick();
  app.fire('appinstalled');assert.equal(app.element('install-entry').hidden,true);assert.equal(app.element('install-banner').hidden,true);
});

test('mobile install assets include valid PNG sizes and stay within the GitHub Pages scope',()=>{
  const path=require('node:path'),root=path.join(__dirname,'../dist');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
  assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
  for(const size of [192,512]){
    const icon=manifest.icons.find(i=>i.sizes===`${size}x${size}`&&i.type==='image/png');assert.ok(icon);
    const bytes=fs.readFileSync(path.join(root,icon.src));assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);
  }
  const apple=fs.readFileSync(path.join(root,'apple-touch-icon.png'));assert.equal(apple.readUInt32BE(16),180);
});
