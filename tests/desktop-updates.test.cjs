const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {DesktopUpdates,updateMode,newer,RELEASES}=require('../electron/updates.cjs');
function fixture(options={}){
 const updater=new EventEmitter(),events=[],installed=[],opened=[];let checks=0,downloads=0;
 updater.checkForUpdates=async()=>{checks++;updater.emit('update-available',{version:'0.3.1'});};
 updater.downloadUpdate=async()=>{downloads++;updater.emit('download-progress',{percent:50,transferred:500,total:1000,bytesPerSecond:100});updater.emit('update-downloaded',{version:'0.3.1'});};
 updater.quitAndInstall=(...args)=>installed.push(args);
 const manager=new DesktopUpdates({version:'0.3.0',mode:'auto',updater,notify:s=>events.push(s),confirmInstall:async()=>true,openExternal:async url=>opened.push(url),...options});
 return {manager,updater,events,installed,opened,counts:()=>({checks,downloads})};
}
test('only installed Windows and actual Linux AppImages enable automatic installation',()=>{
 for(const platform of ['win32','linux','darwin'])assert.equal(updateMode({packaged:false,platform,installed:true,appImage:true}),'development');
 assert.equal(updateMode({packaged:true,platform:'win32',installed:true}),'auto');
 assert.equal(updateMode({packaged:true,platform:'win32',installed:true,portable:true}),'manual');
 assert.equal(updateMode({packaged:true,platform:'win32',installed:false}),'manual');
 assert.equal(updateMode({packaged:true,platform:'darwin',installed:true}),'manual');
 assert.equal(updateMode({packaged:true,platform:'linux',appImage:true}),'auto');
 assert.equal(updateMode({packaged:true,platform:'linux'}),'manual');
});
test('stable version checks exclude downgrades, prereleases, malformed and equal versions',()=>{
 for(const v of ['0.2.9','0.3.0','0.3.1-beta.1','v0.3.1','next','',null])assert.equal(newer(v,'0.3.0'),false);
 for(const v of ['0.3.1','0.10.0','1.0.0'])assert.equal(newer(v,'0.3.0'),true);
});
test('checking never downloads; verified download waits for explicit confirmed installation',async()=>{
 const f=fixture();assert.equal(f.updater.autoDownload,false);assert.equal(f.updater.autoInstallOnAppQuit,false);assert.equal(f.updater.allowDowngrade,false);assert.equal(f.updater.allowPrerelease,false);
 await f.manager.check();assert.equal(f.manager.snapshot().status,'available');assert.deepEqual(f.counts(),{checks:1,downloads:0});
 await f.manager.download();assert.equal(f.manager.snapshot().status,'downloaded');assert.equal(f.manager.snapshot().canInstall,true);assert.deepEqual(f.installed,[]);
 assert.ok(f.events.some(s=>s.status==='downloading'&&s.percent===50));
 await f.manager.install('zh-CN');assert.deepEqual(f.installed,[[true,true]]);assert.equal(f.manager.snapshot().status,'installing');f.manager.close();
});
test('concurrent checks and downloads are coalesced; checks cannot overwrite a staged update',async()=>{
 const f=fixture();let done;f.updater.checkForUpdates=()=>new Promise(r=>done=r);
 const pending=f.manager.check();await f.manager.check();assert.equal(f.manager.snapshot().status,'checking');done();await pending;
 f.updater.emit('update-available',{version:'0.3.1'});let finish;
 f.updater.downloadUpdate=()=>new Promise(r=>finish=r);const download=f.manager.download();await f.manager.download();await f.manager.check();assert.equal(f.manager.snapshot().status,'downloading');
 f.updater.emit('update-downloaded',{version:'0.3.1'});finish();await download;await f.manager.check();assert.equal(f.manager.snapshot().status,'downloaded');f.manager.close();
});
test('offline checks and failed package verification keep the app running and allow retry',async()=>{
 const f=fixture();f.updater.checkForUpdates=async()=>{throw Error('offline');};await f.manager.check();assert.equal(f.manager.snapshot().errorCode,'check');assert.equal(f.manager.snapshot().canInstall,false);
 f.updater.emit('update-available',{version:'0.3.1'});f.updater.downloadUpdate=async()=>{throw Error('SHA512 mismatch');};await f.manager.download();assert.equal(f.manager.snapshot().canDownload,true);assert.equal(f.manager.snapshot().canInstall,false);await f.manager.install('en');assert.deepEqual(f.installed,[]);
 f.updater.downloadUpdate=async()=>f.updater.emit('update-downloaded',{version:'0.3.1'});await f.manager.download();assert.equal(f.manager.snapshot().status,'downloaded');f.manager.close();
});
test('unverified or unrelated update events never grant installation capability',async()=>{
 const f=fixture();f.updater.emit('update-downloaded',{version:'0.3.1'});assert.equal(f.manager.snapshot().canInstall,false);
 await f.manager.check();f.updater.emit('update-downloaded',{version:'0.4.0'});assert.equal(f.manager.snapshot().canInstall,false);
 f.updater.emit('update-available',{version:'0.2.0'});assert.equal(f.manager.snapshot().canDownload,false);f.manager.close();
});
test('declining installation leaves the downloaded update staged and preserves current timers',async()=>{
 let before=0;const f=fixture({confirmInstall:async()=>false,beforeInstall:()=>before++});await f.manager.check();await f.manager.download();await f.manager.install('en');assert.equal(f.manager.snapshot().status,'downloaded');assert.deepEqual(f.installed,[]);assert.equal(before,0);
 await assert.rejects(()=>f.manager.install('invalid'));f.manager.close();
});
test('installer failure is retryable, and repeated install clicks open only one confirmation',async()=>{
 let confirm;const f=fixture({confirmInstall:()=>new Promise(r=>confirm=r)});await f.manager.check();await f.manager.download();const pending=f.manager.install('en');await f.manager.install('en');confirm(false);await pending;
 f.manager.confirmInstall=async()=>true;f.updater.quitAndInstall=()=>f.updater.emit('error',Error('spawn failed'));await f.manager.install('en');assert.equal(f.manager.snapshot().errorCode,'install');assert.equal(f.manager.snapshot().canInstall,true);
 f.updater.quitAndInstall=(...args)=>f.installed.push(args);await f.manager.install('en');assert.equal(f.installed.length,1);f.manager.close();
});
test('portable and unsigned macOS editions check stable releases and open only the fixed official URL',async()=>{
 const f=fixture({mode:'manual',updater:null,fetchRelease:async()=>({tag_name:'v0.3.1',html_url:'https://evil.invalid',prerelease:false,draft:false})});await f.manager.check();assert.equal(f.manager.snapshot().status,'available');assert.equal(f.manager.snapshot().canDownload,false);await f.manager.download();await f.manager.install('en');assert.deepEqual(f.installed,[]);await f.manager.openRelease();assert.deepEqual(f.opened,[RELEASES]);f.manager.close();
});
test('development/smoke modes never fetch, download or install release updates',async()=>{
 let calls=0;const f=fixture({mode:'development',updater:null,fetchRelease:async()=>calls++});f.manager.start();await f.manager.check();await f.manager.download();await f.manager.install('en');assert.equal(calls,0);assert.equal(f.manager.snapshot().status,'idle');f.manager.close();
});
