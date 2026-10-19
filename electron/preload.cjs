const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('kingshotDesktop',Object.freeze({
  setPinned:flag=>ipcRenderer.invoke('window:pin',flag),
  setCompact:flag=>ipcRenderer.invoke('window:compact',flag),
  getWindowState:()=>ipcRenderer.invoke('window:state'),
  setAlarms:events=>ipcRenderer.invoke('alarms:replace',events),
  getUpdateState:()=>ipcRenderer.invoke('updates:state'),
  checkForUpdates:()=>ipcRenderer.invoke('updates:check'),
  downloadUpdate:()=>ipcRenderer.invoke('updates:download'),
  installUpdate:language=>ipcRenderer.invoke('updates:install',language),
  openUpdateRelease:()=>ipcRenderer.invoke('updates:releases'),
  onUpdate:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('updates:changed',listener);return()=>ipcRenderer.removeListener('updates:changed',listener);},
  onResume:callback=>{const listener=()=>callback();ipcRenderer.on('clock:resume',listener);return()=>ipcRenderer.removeListener('clock:resume',listener);}
}));
