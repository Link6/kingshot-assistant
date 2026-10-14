const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/install.js'),'utf8');
function setup(options={}){
  const elements=new Map(),windowEvents=new Map(),documentEvents=new Map(),storage=options.storage||new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:true,textContent:'',disabled:false,attrs:{},handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},setAttribute(k,v){this.attrs[k]=v;},focus(){this.focused=true;},scrollIntoView(){}});return elements.get(id);};
  const display={matches:!!options.standalone,addEventListener(_,fn){this.changed=fn;}};
  const window={kingshotDesktop:options.desktop,KingshotI18n:{t:key=>`${options.language||'zh'}:${key}`},addEventListener:(k,v)=>windowEvents.set(k,v)};
  const document={hidden:false,getElementById:element,addEventListener:(k,v)=>documentEvents.set(k,v)};
  const navigator={userAgent:options.ua??'Mozilla/5.0 (Linux; Android 15) Chrome/130',platform:options.platform||'',maxTouchPoints:options.touch||0,standalone:options.navigatorStandalone};
  class Clock extends Date{static now(){return options.now??1000000000;}}
  vm.runInNewContext(source,{window,document,navigator,location:{protocol:options.protocol||'https:',href:'https://example.com/kingshot-assistant/'},URL,Date:Clock,matchMedia:()=>display,queueMicrotask,localStorage:{getItem:key=>{if(options.storageBlocked)throw Error('blocked');return storage.get(key)??null;},setItem:(key,value)=>{if(options.storageBlocked)throw Error('blocked');storage.set(key,value);}}});
  return {element,display,storage,window,events:windowEvents,fire:(type,event)=>windowEvents.get(type)?.(event),click:id=>element(id).handlers.click?.()};
}
test('Android offers install only when the browser supplies an event, and consumes it once',async()=>{
  const app=setup();assert.equal(app.element('install-banner').hidden,false);assert.equal(app.element('install-action').textContent,'zh:installHow');
  let calls=0,prevented=false;
  app.fire('beforeinstallprompt',{preventDefault(){prevented=true;},async prompt(){calls++;},userChoice:Promise.resolve({outcome:'accepted'})});
  assert.equal(prevented,true);assert.equal(app.element('install-action').textContent,'zh:installNow');
  await Promise.all([app.click('install-action'),app.click('install-action')]);
  assert.equal(calls,1);assert.equal(app.element('install-banner').hidden,true);assert.equal(app.element('install-entry').hidden,true);
});
test('dismissal lasts seven days across reloads, with a manual entry still available',()=>{
  const app=setup();app.click('install-dismiss');
  const next=setup({storage:app.storage,now:1000000001});assert.equal(next.element('install-banner').hidden,true);assert.equal(next.element('install-entry').hidden,false);
  next.click('install-entry');assert.equal(next.element('install-banner').hidden,false);assert.equal(next.element('install-help').hidden,false);
  const later=setup({storage:app.storage,now:1000000000+7*86400000});assert.equal(later.element('install-banner').hidden,false);
});
test('iPhone, iPad desktop user agent and embedded browsers get appropriate instructions',()=>{
  for(const options of [{ua:'iPhone Safari'},{ua:'Macintosh Safari',platform:'MacIntel',touch:5}]){
    const app=setup(options);app.click('install-action');assert.equal(app.element('install-help').textContent,'zh:installIOS');
  }
  const app=setup({ua:'iPhone MicroMessenger'});app.click('install-action');assert.equal(app.element('install-help').textContent,'zh:installEmbedded');
});
test('desktop, Electron, local files and standalone apps do not show install UI',()=>{
  for(const options of [{ua:'Windows Chrome'},{desktop:{}},{protocol:'file:'},{standalone:true},{navigatorStandalone:true}]){
    const app=setup(options);assert.equal(app.element('install-banner').hidden,true);assert.equal(app.element('install-entry').hidden,true);
  }
  const app=setup();app.display.matches=true;app.display.changed();assert.equal(app.element('install-banner').hidden,true);
});
test('cancelled or failed browser prompts recover safely, even with storage blocked',async()=>{
  const app=setup({storageBlocked:true});
  app.fire('beforeinstallprompt',{preventDefault(){},async prompt(){},userChoice:Promise.resolve({outcome:'dismissed'})});
  await app.click('install-action');assert.equal(app.element('install-banner').hidden,true);assert.equal(app.element('install-entry').hidden,false);
  app.click('install-entry');app.fire('beforeinstallprompt',{preventDefault(){},async prompt(){throw Error('unavailable');}});
  await app.click('install-action');assert.equal(app.element('install-help').hidden,false);assert.equal(app.element('install-action').disabled,false);
  app.fire('appinstalled');assert.equal(app.element('install-entry').hidden,true);
});
test('mobile install assets include valid PNG sizes and stay within the GitHub Pages scope',()=>{
  const path=require('node:path'),root=path.join(__dirname,'../dist');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
  assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
  for(const size of [192,512]){
    const icon=manifest.icons.find(i=>i.sizes===`${size}x${size}`&&i.type==='image/png');assert.ok(icon);
    const bytes=fs.readFileSync(path.join(root,icon.src));assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);
  }
  const apple=fs.readFileSync(path.join(root,'apple-touch-icon.png'));assert.equal(apple.readUInt32BE(16),180);
});
