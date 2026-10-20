'use strict';
const {app,BrowserWindow,ipcMain,powerMonitor,screen,Notification,dialog,net,shell}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {AlarmQueue}=require('./alarms.cjs');
const {DesktopUpdates,updateMode,RELEASE_API}=require('./updates.cjs');
const {DesktopRoomAuth}=require('./rooms-auth.cjs');
const smoke=process.argv.includes('--smoke-test');
if(smoke){app.disableHardwareAcceleration();app.setPath('userData',path.join(process.cwd(),'.runtime','smoke-user-data'));}
app.setAppUserModelId('io.github.link6.kingshot-assistant');
const entry=path.join(__dirname,'..','dist','index.html'),entryURL=pathToFileURL(entry).href;
const icon=path.join(__dirname,'icons',process.platform==='win32'?'icon.ico':'icon.png');
let win,fullBounds,compact=false,pinned=false,alarmInterval,updates,roomAuth;
const queue=new AlarmQueue();
const preferences=()=>path.join(app.getPath('userData'),'window.json');
function validBounds(b){return b&&['x','y','width','height'].every(k=>Number.isInteger(b[k]))&&b.width>=400&&b.height>=400&&b.width<=4000&&b.height<=3000&&screen.getAllDisplays().some(d=>b.x<d.workArea.x+d.workArea.width&&b.x+b.width>d.workArea.x&&b.y<d.workArea.y+d.workArea.height&&b.y+b.height>d.workArea.y);}
function persist(){if(smoke||!win)return;try{fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.writeFileSync(preferences(),JSON.stringify({bounds:compact?fullBounds:win.getNormalBounds(),pinned}));}catch{}}
function authorized(event){if(!win||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||event.senderFrame.url.split('#')[0]!==entryURL)throw new Error('Untrusted sender');}
function pin(flag){if(typeof flag!=='boolean')throw new TypeError('Boolean required');pinned=flag;win.setAlwaysOnTop(flag);persist();return win.isAlwaysOnTop();}
function resizeCompact(flag){
  if(typeof flag!=='boolean')throw new TypeError('Boolean required');
  if(flag===compact)return compact;
  if(flag){fullBounds=win.getNormalBounds();if(win.isMaximized())win.unmaximize();win.setMinimumSize(400,400);win.setSize(490,610);}
  else{win.setMinimumSize(720,560);if(validBounds(fullBounds))win.setBounds(fullBounds);else win.setSize(1250,850);}
  compact=flag;return compact;
}
function resetClock(){queue.clear();if(win&&!win.isDestroyed())win.webContents.send('clock:resume');}
async function createWindow(){
  let saved={};try{saved=JSON.parse(fs.readFileSync(preferences(),'utf8'));}catch{}
  pinned=saved.pinned===true;
  win=new BrowserWindow({width:1250,height:850,...(validBounds(saved.bounds)?saved.bounds:{}),minWidth:720,minHeight:560,show:false,backgroundColor:'#11171b',autoHideMenuBar:true,title:'Kingshot Assistant',icon,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  win.setMenu(null);win.setAlwaysOnTop(pinned);
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(url.split('#')[0]!==entryURL)event.preventDefault();});
  win.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  win.webContents.on('render-process-gone',()=>{queue.clear();roomAuth?.cancel();});
  win.webContents.on('did-start-navigation',(_event,_url,inPlace,isMainFrame)=>{if(isMainFrame&&!inPlace)roomAuth?.cancel();});
  win.on('close',persist);win.on('closed',()=>{win=null;queue.clear();roomAuth?.cancel();});
  await win.loadFile(entry);
  if(smoke){
    // Exercise the native shell without displaying a test window or editing user data.
    const pinWorks=pin(true)&&!pin(false);resizeCompact(true);const small=win.getBounds();resizeCompact(false);
    const prefs=win.webContents.getLastWebPreferences();
    const petChecks=await require('./smoke-ui.cjs')(win,entry);
    const roomChecks=await require('./smoke-rooms.cjs')(win,entry,roomAuth);
    const result={loaded:win.webContents.getURL().startsWith(entryURL),pinWorks,compactWorks:small.width===490,isolated:prefs.contextIsolation,sandboxed:prefs.sandbox,nodeDisabled:!prefs.nodeIntegration,...petChecks,...roomChecks};
    fs.writeFileSync(path.join(process.cwd(),'.desktop-smoke.json'),JSON.stringify(result,null,2));
    app.exit(Object.values(result).every(Boolean)?0:1);
  }else win.show();
}
if(!smoke&&!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
  app.whenReady().then(async()=>{
    roomAuth=new DesktopRoomAuth({parent:()=>win,openExternal:url=>shell.openExternal(url),fetcher:(url,options)=>net.fetch(url,options)});
    ipcMain.handle('rooms:prepare-login',(e,language)=>{authorized(e);return roomAuth.prepare(language);});
    ipcMain.handle('rooms:login',(e,url,id)=>{authorized(e);return roomAuth.login(url,id);});
    ipcMain.handle('rooms:cancel-login',(e,id)=>{authorized(e);roomAuth.cancel(id);});
    ipcMain.handle('rooms:verify',(e,tokens)=>{authorized(e);return roomAuth.verify(tokens);});
    const mode=updateMode({packaged:app.isPackaged&&!smoke,platform:process.platform,portable:!!(process.env.PORTABLE_EXECUTABLE_DIR||process.env.PORTABLE_EXECUTABLE_FILE),installed:fs.existsSync(path.join(path.dirname(app.getPath('exe')),'Uninstall Kingshot Assistant.exe')),appImage:!!process.env.APPIMAGE});
    updates=new DesktopUpdates({version:app.getVersion(),mode,updater:mode==='auto'?require('electron-updater').autoUpdater:null,
      fetchRelease:async()=>{const response=await net.fetch(RELEASE_API,{headers:{Accept:'application/vnd.github+json','User-Agent':'Kingshot-Assistant'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Release unavailable');const text=await response.text();if(text.length>256*1024)throw new Error('Release too large');return JSON.parse(text);},
      notify:state=>{if(win&&!win.isDestroyed())win.webContents.send('updates:changed',state);},
      confirmInstall:async(language,version)=>{const zh=language==='zh-CN';const result=await dialog.showMessageBox(win,{type:'question',title:zh?'安装更新':'Install update',message:zh?`安装 v${version} 会关闭应用并结束当前计时。现在安装并重启？`:`Installing v${version} closes the app and ends current timers. Install and restart now?`,buttons:zh?['安装并重启','稍后']:['Install and restart','Later'],defaultId:1,cancelId:1,noLink:true});return result.response===0;},
      beforeInstall:()=>persist(),openExternal:url=>shell.openExternal(url)});
    ipcMain.handle('updates:state',e=>{authorized(e);return updates.snapshot();});
    ipcMain.handle('updates:check',e=>{authorized(e);return updates.check();});
    ipcMain.handle('updates:download',e=>{authorized(e);return updates.download();});
    ipcMain.handle('updates:install',(e,language)=>{authorized(e);return updates.install(language);});
    ipcMain.handle('updates:releases',e=>{authorized(e);return updates.openRelease();});
    ipcMain.handle('window:pin',(e,flag)=>{authorized(e);return pin(flag);});
    ipcMain.handle('window:compact',(e,flag)=>{authorized(e);return resizeCompact(flag);});
    ipcMain.handle('window:state',e=>{authorized(e);return{pinned:win.isAlwaysOnTop()};});
    ipcMain.handle('alarms:replace',(e,events)=>{authorized(e);queue.replace(events);return true;});
    powerMonitor.on('suspend',resetClock);powerMonitor.on('resume',resetClock);
    let lastWall=Date.now(),lastMono=performance.now();
    alarmInterval=setInterval(()=>{
      const wall=Date.now(),mono=performance.now();
      if(wall-lastWall>10000||Math.abs((wall-lastWall)-(mono-lastMono))>3000)resetClock();
      lastWall=wall;lastMono=mono;
      for(const event of queue.due(wall))if(win&&!win.isFocused()&&!smoke&&Notification.isSupported())new Notification({title:event.title,body:event.body,icon,silent:true}).show();
    },100);
    await createWindow();
    updates.start();
    app.on('activate',()=>{if(!win)createWindow().catch(()=>app.quit());});
  }).catch(err=>{console.error(err.message);app.exit(1);});
  app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
  app.on('will-quit',()=>{clearInterval(alarmInterval);updates?.close();});
}
