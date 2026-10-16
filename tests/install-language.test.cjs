const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../dist');
const source=fs.readFileSync(path.join(root,'i18n.js'),'utf8');
function boot({browserLanguage='en-US',saved,blocked=false,scope='/kingshot-assistant/'}={}){
  const attrs={},apple={},events=[],storageReads=[];
  const manifest={getAttribute:key=>attrs[key]??null,setAttribute:(key,value)=>attrs[key]=value};
  const document={documentElement:{lang:'zh-CN'},querySelector:selector=>selector==='link[rel="manifest"]'?manifest:{setAttribute:(key,value)=>apple[key]=value},querySelectorAll:()=>[]};
  const context={document,navigator:{language:browserLanguage},location:{href:'https://example.com'+scope},URL,Event,
    dispatchEvent:event=>events.push(event.type),localStorage:{getItem:key=>{storageReads.push(key);if(blocked)throw Error('blocked');return saved??null;}}};
  vm.runInNewContext(source,context);
  return {I:context.KingshotI18n,document,attrs,apple,events,storageReads};
}
test('initial installation metadata follows browser language before application startup',()=>{
  for(const [browserLanguage,locale,file] of [['en-US','en','manifest.en.webmanifest'],['fr-FR','en','manifest.en.webmanifest'],['ko','en','manifest.en.webmanifest'],['zh-CN','zh-CN','manifest.webmanifest'],['zh-TW','zh-CN','manifest.webmanifest']]){
    const app=boot({browserLanguage});
    const manifest=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
    assert.equal(app.I.language,locale);assert.equal(app.attrs.href,file);
    assert.equal(app.document.documentElement.lang,locale);
    assert.equal(app.apple.content,manifest.short_name);
    assert.equal(manifest.name,app.I.t('installAppName'));
    assert.equal(app.document.title,app.I.t('appTitle'));
  }
});
test('saved language overrides browser language using the same scoped key as the app',()=>{
  const english=boot({browserLanguage:'zh-CN',saved:'en'});
  assert.equal(english.attrs.href,'manifest.en.webmanifest');
  assert.deepEqual(english.storageReads,['kingshot:/kingshot-assistant/:language']);
  assert.equal(boot({browserLanguage:'en',saved:'zh-CN',scope:'/'}).attrs.href,'manifest.webmanifest');
  assert.equal(boot({browserLanguage:'en',blocked:true}).attrs.href,'manifest.en.webmanifest');
});
test('language switching updates manifest and Apple name without refetching unchanged locales',()=>{
  const app=boot({browserLanguage:'zh-CN'});
  assert.equal(app.events.length,1);
  app.I.setLanguage('en');app.I.apply();
  assert.equal(app.attrs.href,'manifest.en.webmanifest');assert.equal(app.apple.content,'Kingshot Timer');
  assert.equal(app.events.length,2);
  app.I.setLanguage('en-GB');assert.equal(app.events.length,2);
  app.I.setLanguage('zh-CN');assert.equal(app.attrs.href,'manifest.webmanifest');assert.equal(app.apple.content,'战术计时');
  assert.equal(app.events.length,3);
});
test('both manifests identify the same app at root or nested paths and are cached offline',()=>{
  const I=require('../dist/i18n.js');
  const zh=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
  const en=JSON.parse(fs.readFileSync(path.join(root,'manifest.en.webmanifest'),'utf8'));
  for(const [locale,manifest] of [['zh-CN',zh],['en',en]]){
    assert.equal(manifest.name,I.t('installAppName',{},locale));
    assert.equal(manifest.short_name,I.t('installShortName',{},locale));
    assert.equal(manifest.lang,locale);
  }
  for(const key of ['id','start_url','scope','display','icons'])assert.deepEqual(en[key],zh[key]);
  for(const scope of ['/','/kingshot-assistant/']){
    const base='https://example.com'+scope;
    for(const key of ['id','start_url','scope'])assert.equal(new URL(zh[key],base+'manifest.webmanifest').href,new URL(en[key],base+'manifest.en.webmanifest').href);
  }
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  assert.ok(sw.includes("'./manifest.webmanifest'"));assert.ok(sw.includes("'./manifest.en.webmanifest'"));
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/<link rel="manifest">/);
  const i18n=html.match(/<script src="(assets\/i18n-[a-f0-9]{16}\.js)"><\/script>/);
  const install=html.match(/src="(assets\/install-[a-f0-9]{16}\.js)"/);
  assert.ok(i18n);assert.ok(install);
  assert.ok(html.indexOf(i18n[1])<html.indexOf(install[1]));
});
