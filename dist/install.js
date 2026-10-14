(function () {
  'use strict';
  const ua=navigator.userAgent||'';
  const ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const mobile=ios||/Android/i.test(ua)||navigator.userAgentData?.mobile===true;
  if(!mobile||window.kingshotDesktop||!['http:','https:'].includes(location.protocol))return;
  const embedded=/MicroMessenger|FBAN|FBAV|Instagram|Line\/|; wv\)/i.test(ua);
  const $=id=>document.getElementById(id),t=key=>window.KingshotI18n.t(key);
  const banner=$('install-banner'),action=$('install-action'),help=$('install-help'),entry=$('install-entry');
  const display=matchMedia('(display-mode: standalone)');
  const key=`kingshot:${new URL('.',location.href).pathname}:install-dismissed-until`;
  const week=7*24*60*60*1000;
  let pending=null,installed=false,busy=false,expanded=false,manual=false,dismissedUntil=0;
  try{const value=Number(localStorage.getItem(key));if(Number.isFinite(value))dismissedUntil=value;}catch{}
  const standalone=()=>installed||display.matches||navigator.standalone===true;
  function render(){
    const hidden=standalone();
    entry.hidden=hidden;
    banner.hidden=hidden||(!manual&&Date.now()<dismissedUntil);
    action.disabled=busy;
    action.textContent=t(pending?'installNow':'installHow');
    action.setAttribute('aria-expanded',String(expanded));
    help.hidden=!expanded;
    help.textContent=t(embedded?'installEmbedded':ios?'installIOS':'installAndroid');
  }
  function dismiss(){
    dismissedUntil=Date.now()+week;
    try{localStorage.setItem(key,String(dismissedUntil));}catch{}
    manual=false;expanded=false;render();
  }
  window.addEventListener('beforeinstallprompt',event=>{
    if(standalone())return;
    event.preventDefault();pending=event;render();
  });
  window.addEventListener('appinstalled',()=>{installed=true;pending=null;dismiss();});
  display.addEventListener?.('change',render);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
  document.addEventListener('DOMContentLoaded',render);
  $('language-select').addEventListener('change',()=>queueMicrotask(render));
  $('install-dismiss').addEventListener('click',dismiss);
  entry.addEventListener('click',()=>{
    manual=true;expanded=!pending;render();action.focus();
    banner.scrollIntoView({block:'center',behavior:'smooth'});
  });
  action.addEventListener('click',async()=>{
    if(busy)return;
    if(!pending){expanded=!expanded;render();return;}
    const prompt=pending;pending=null;busy=true;render();
    try{
      await prompt.prompt();
      const choice=await prompt.userChoice;
      if(choice.outcome==='accepted')installed=true;
      dismiss();
    }catch{expanded=true;manual=true;}
    finally{busy=false;render();}
  });
  render();
})();
