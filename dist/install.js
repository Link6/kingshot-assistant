(function () {
  'use strict';
  const ua=navigator.userAgent||'';
  const ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const mobile=ios||/Android/i.test(ua)||navigator.userAgentData?.mobile===true;
  if(window.kingshotDesktop||!['http:','https:'].includes(location.protocol))return;
  const embedded=/MicroMessenger|FBAN|FBAV|Instagram|Line\/|; wv\)/i.test(ua);
  const $=id=>document.getElementById(id),t=key=>window.KingshotI18n.t(key);
  const banner=$('install-banner'),help=$('install-help'),entry=$('install-entry');
  const display=matchMedia('(display-mode: standalone)');
  let pending=null,installed=false,busy=false,manual=false;
  const standalone=()=>installed||display.matches||navigator.standalone===true;
  function render(){
    const hidden=standalone();
    entry.hidden=hidden||(!pending&&!mobile&&!manual&&!busy);
    entry.disabled=busy;
    entry.textContent=t(pending||busy?'installNow':'installHelp');
    banner.hidden=hidden||!manual;
    help.hidden=false;
    help.textContent=t(embedded?'installEmbedded':ios?'installIOS':mobile?'installAndroid':'installDesktop');
  }
  window.addEventListener('beforeinstallprompt',event=>{
    if(standalone())return;
    // Keep the browser's own installation promotion enabled. Never cancel this event.
    pending=event;manual=false;render();
    // The browser may show its own prompt before our button is used.
    event.userChoice.then(choice=>{
      if(pending===event)pending=null;
      if(choice.outcome==='accepted'){installed=true;manual=false;}
      render();
    }).catch(()=>{if(pending===event)pending=null;render();});
  });
  window.addEventListener('appinstalled',()=>{installed=true;pending=null;manual=false;render();});
  // A previously captured event may still contain the old language's app name.
  window.addEventListener('kingshot:install-language-change',()=>{pending=null;render();});
  display.addEventListener?.('change',render);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
  document.addEventListener('DOMContentLoaded',render);
  $('language-select').addEventListener('change',()=>queueMicrotask(render));
  $('install-dismiss').addEventListener('click',()=>{manual=false;render();entry.focus();});
  entry.addEventListener('click',async()=>{
    if(busy)return;
    if(!pending){
      manual=true;render();$('install-dismiss').focus();
      banner.scrollIntoView({block:'center',behavior:'smooth'});
      return;
    }
    const prompt=pending;pending=null;busy=true;manual=false;render();
    try{
      // Invoke synchronously within the click to retain the required user activation.
      await prompt.prompt();
      const choice=await prompt.userChoice;
      if(choice.outcome==='accepted')installed=true;
    }catch{manual=true;}
    finally{busy=false;render();}
  });
  render();
})();
