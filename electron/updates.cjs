'use strict';
const RELEASES='https://github.com/Link6/kingshot-assistant/releases/latest';
const RELEASE_API='https://api.github.com/repos/Link6/kingshot-assistant/releases/latest';
function stableVersion(value){return typeof value==='string'&&/^\d+\.\d+\.\d+$/.test(value)&&value.length<40;}
function newer(next,current){if(!stableVersion(next)||!stableVersion(current))return false;const a=next.split('.').map(Number),b=current.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;}
function updateMode({packaged,platform,portable=false,installed=false,appImage=false}){
  if(!packaged)return 'development';
  return platform==='win32'&&!portable&&installed||platform==='linux'&&appImage?'auto':'manual';
}
class DesktopUpdates{
  constructor({version,mode,updater,fetchRelease,notify=()=>{},confirmInstall=async()=>false,beforeInstall=()=>{},openExternal=async()=>{}}){
    this.updater=updater;this.fetchRelease=fetchRelease;this.notify=notify;this.confirmInstall=confirmInstall;this.beforeInstall=beforeInstall;this.openExternal=openExternal;
    this.state={currentVersion:version,mode,status:'idle',version:'',percent:0,transferred:0,total:0,bytesPerSecond:0,errorCode:'',canDownload:false,canInstall:false};
    this.candidate=null;this.downloaded=false;this.operation=null;this.prompting=false;this.closed=false;this.listeners=[];
    if(mode==='auto'){
      updater.autoDownload=false;updater.autoInstallOnAppQuit=false;updater.allowPrerelease=false;updater.allowDowngrade=false;updater.disableWebInstaller=true;
      this.listen('update-available',info=>{if(!newer(info.version,version)){this.candidate=null;this.set({status:'upToDate',version:'',canDownload:false});return;}this.candidate=info.version;this.set({status:'available',version:info.version,errorCode:'',canDownload:true});});
      this.listen('update-not-available',()=>{this.candidate=null;this.set({status:'upToDate',version:'',canDownload:false,errorCode:''});});
      this.listen('download-progress',p=>{const number=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isFinite(n)?Math.min(max,Math.max(0,n)):0;this.set({status:'downloading',percent:number(p.percent,100),transferred:number(p.transferred),total:number(p.total),bytesPerSecond:number(p.bytesPerSecond)},true);});
      this.listen('update-downloaded',info=>{if(info.version!==this.candidate)return;this.downloaded=true;this.set({status:'downloaded',percent:100,canDownload:false,canInstall:true,errorCode:''});});
      this.listen('error',()=>this.fail(this.operation||'check'));
    }
  }
  listen(event,handler){this.updater.on(event,handler);this.listeners.push([event,handler]);}
  snapshot(){return {...this.state};}
  set(patch,throttle=false){if(this.closed)return;Object.assign(this.state,patch);const now=Date.now();if(throttle&&now-(this.lastProgress||0)<250)return;if(throttle)this.lastProgress=now;this.notify(this.snapshot());}
  fail(operation){if(operation==='install')this.operation=null;this.set({status:'error',errorCode:operation,canDownload:!!this.candidate&&!this.downloaded,canInstall:this.downloaded});}
  async check(){
    if(this.closed||this.operation||this.prompting||this.downloaded||this.state.mode==='development')return this.snapshot();
    this.operation='check';this.set({status:'checking',errorCode:''});
    try{
      if(this.state.mode==='auto')await this.updater.checkForUpdates();
      else{
        const release=await this.fetchRelease();const version=release.tag_name?.replace(/^v/,'');
        if(release.draft||release.prerelease||!stableVersion(version))throw new Error('Invalid stable release');
        this.candidate=newer(version,this.state.currentVersion)?version:null;
        this.set({status:this.candidate?'available':'upToDate',version:this.candidate||'',canDownload:false,errorCode:''});
      }
    }catch{this.fail('check');}finally{this.operation=null;}
    return this.snapshot();
  }
  async download(){
    if(this.closed||this.operation||this.prompting||this.state.mode!=='auto'||!this.candidate||this.downloaded)return this.snapshot();
    this.operation='download';this.set({status:'downloading',percent:0,transferred:0,total:0,bytesPerSecond:0,errorCode:'',canDownload:false});
    try{await this.updater.downloadUpdate();}catch{this.fail('download');}finally{this.operation=null;}
    return this.snapshot();
  }
  async install(language){
    if(this.closed||this.operation||this.prompting||!this.downloaded||this.state.mode!=='auto')return this.snapshot();
    if(!['zh-CN','en'].includes(language))throw new TypeError('Unsupported language');
    this.prompting=true;
    try{
      if(!await this.confirmInstall(language,this.candidate))return this.snapshot();
      this.operation='install';this.set({status:'installing',errorCode:'',canInstall:false});
      this.beforeInstall();this.updater.quitAndInstall(true,true);
    }catch{this.fail('install');this.operation=null;}finally{this.prompting=false;}
    return this.snapshot();
  }
  async openRelease(){await this.openExternal(RELEASES);return true;}
  start(){if(this.state.mode==='development')return;this.startTimer=setTimeout(()=>this.check(),10000);this.startTimer.unref?.();this.interval=setInterval(()=>this.check(),6*60*60*1000);this.interval.unref?.();}
  close(){this.closed=true;clearTimeout(this.startTimer);clearInterval(this.interval);for(const [event,handler] of this.listeners)this.updater.removeListener(event,handler);}
}
module.exports={DesktopUpdates,updateMode,newer,RELEASES,RELEASE_API};
