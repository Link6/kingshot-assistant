const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('kingshotDesktop',Object.freeze({
  setPinned:flag=>ipcRenderer.invoke('window:pin',flag),
  setCompact:flag=>ipcRenderer.invoke('window:compact',flag),
  getWindowState:()=>ipcRenderer.invoke('window:state'),
  setAlarms:events=>ipcRenderer.invoke('alarms:replace',events),
  onResume:callback=>{const listener=()=>callback();ipcRenderer.on('clock:resume',listener);return()=>ipcRenderer.removeListener('clock:resume',listener);}
}));
