'use strict';
// Runs only in the isolated, hidden --smoke-test window.
module.exports=async function petSmoke(win,entry){
  await win.webContents.executeJavaScript('localStorage.clear()');
  await win.loadFile(entry);
  const initial=await win.webContents.executeJavaScript(`(${function(){
    const $=id=>document.getElementById(id),rows=()=>[...document.querySelectorAll('#guard-rows>.person-row')];
    const saved=()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith(':drafts:v2'))));
    const elapsed=(i,value)=>{const input=rows()[i].querySelector('[data-pet-elapsed]');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));};
    document.querySelector('[data-tab="guard"]').click();$('guard-example').click();
    rows()[0].querySelector('[data-record]').click();
    elapsed(0,'116');rows()[0].querySelector('[data-pet-start]').click();
    const first=saved().guard[0].pet.startedAt;
    const petDoesNotDirtyAttack=!rows()[0].querySelector('.record-status').classList.contains('dirty');
    rows()[0].querySelector('[data-record]').click();
    const petRerecordPreservesTime=saved().guard[0].pet.startedAt===first;
    rows()[1].querySelector('[data-pet-start]').click();
    const pets=saved().guard.map(r=>r.pet.startedAt);
    const petStartsIndependently=pets[0]===first&&pets[1]>first;
    const petWarningVisible=!$('pet-reminders').hidden&&rows()[0].querySelector('.pet-timer').classList.contains('warning')&&!rows()[1].querySelector('.pet-timer').classList.contains('warning');
    const petNoAutoMarchChange=saved().guard[0].march==='35'&&saved().guard[1].march==='38';
    $('language-select').value='en';$('language-select').dispatchEvent(new Event('change',{bubbles:true}));
    const petLanguageKeepsEstimate=JSON.stringify(saved().guard.map(r=>r.pet.startedAt))===JSON.stringify(pets);
    return {pets,checks:{petDoesNotDirtyAttack,petRerecordPreservesTime,petStartsIndependently,petWarningVisible,petNoAutoMarchChange,petLanguageKeepsEstimate}};
  }.toString()})()`);
  await win.loadFile(entry);
  const after=await win.webContents.executeJavaScript(`(${function(expected){
    const $=id=>document.getElementById(id),rows=()=>[...document.querySelectorAll('#guard-rows>.person-row')];
    const saved=()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith(':drafts:v2'))));
    const petReloadRestores=JSON.stringify(saved().guard.map(r=>r.pet.startedAt))===JSON.stringify(expected)&&!$('pet-reminders').hidden;
    rows()[0].querySelector('[data-pet-stop]').click();
    const petStopIsolated=saved().guard[0].pet===null&&saved().guard[1].pet.startedAt===expected[1]&&$('pet-reminders').hidden;
    const input=rows()[1].querySelector('[data-pet-elapsed]');input.value='121';input.dispatchEvent(new Event('input',{bubbles:true}));rows()[1].querySelector('[data-pet-start]').click();
    const petInvalidEditPreservesTime=saved().guard[1].pet.startedAt===expected[1]&&!rows()[1].querySelector('.pet-timer .form-error').hidden;
    return {petReloadRestores,petStopIsolated,petInvalidEditPreservesTime};
  }.toString()})(${JSON.stringify(initial.pets)})`);
  const rally=await win.webContents.executeJavaScript(`(${function(){
    const $=id=>document.getElementById(id),rows=()=>[...document.querySelectorAll('#rally-rows>.person-row')];
    const saved=()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith(':drafts:v2'))));
    const elapsed=(i,value)=>{const input=rows()[i].querySelector('[data-pet-elapsed]');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));};
    document.querySelector('[data-tab="rally"]').click();$('rally-example').click();$('start-rally').click();
    const schedule=$('rally-share-text').value,guard=JSON.stringify(saved().guard);
    elapsed(0,'116');rows()[0].querySelector('[data-pet-start]').click();
    rows()[1].querySelector('[data-pet-start]').click();
    const pets=saved().rally.slice(0,2).map(r=>r.pet.startedAt);
    const rallyPetKeepsSchedule=$('rally-share-text').value===schedule&&$('rally-dirty').hidden;
    const rallyPetWarning=!$('rally-pet-reminders').hidden&&$('rally-pet-reminder-text').textContent.includes('regenerate')&&rows()[0].querySelector('.pet-timer').classList.contains('warning')&&!rows()[1].querySelector('.pet-timer').classList.contains('warning');
    const rallyPetIndependent=pets[0]<pets[1]&&JSON.stringify(saved().guard)===guard;
    $('start-rally').click();
    const rallyRegenerateKeepsPet=JSON.stringify(saved().rally.slice(0,2).map(r=>r.pet.startedAt))===JSON.stringify(pets);
    $('language-select').value='zh-CN';$('language-select').dispatchEvent(new Event('change',{bubbles:true}));
    const rallyLanguageKeepsPet=JSON.stringify(saved().rally.slice(0,2).map(r=>r.pet.startedAt))===JSON.stringify(pets);
    return {pets,checks:{rallyPetKeepsSchedule,rallyPetWarning,rallyPetIndependent,rallyRegenerateKeepsPet,rallyLanguageKeepsPet}};
  }.toString()})()`);
  await win.loadFile(entry);
  const rallyAfter=await win.webContents.executeJavaScript(`(${async function(expected){
    const $=id=>document.getElementById(id),rows=()=>[...document.querySelectorAll('#rally-rows>.person-row')];
    const saved=()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith(':drafts:v2'))));
    const rallyReloadRestores=JSON.stringify(saved().rally.slice(0,2).map(r=>r.pet.startedAt))===JSON.stringify(expected)&&!$('rally-pet-reminders').hidden;
    document.querySelector('[data-tab="guard"]').click();$('focus-toggle').click();$('rally-pet-update-march').click();
    await new Promise(resolve=>setTimeout(resolve,200));
    const rallyReminderNavigates=!$('rally-page').hidden&&!document.body.classList.contains('focus-mode')&&document.activeElement===rows()[0].querySelector('[data-field="march"]');
    const input=rows()[0].querySelector('[data-pet-elapsed]');input.value='121';input.dispatchEvent(new Event('input',{bubbles:true}));rows()[0].querySelector('[data-pet-start]').click();
    const rallyInvalidKeepsPet=saved().rally[0].pet.startedAt===expected[0]&&!rows()[0].querySelector('.pet-timer .form-error').hidden;
    const march=rows()[0].querySelector('[data-field="march"]');$('start-rally').click();march.value='36';march.dispatchEvent(new Event('input',{bubbles:true}));
    const rallyMarchRequiresRegenerate=!$('rally-dirty').hidden;
    rows()[0].querySelector('[data-pet-stop]').click();
    const rallyStopIsolated=saved().rally[0].pet===null&&saved().rally[1].pet.startedAt===expected[1]&&$('rally-pet-reminders').hidden&&saved().guard[1].pet!==null;
    return {rallyReloadRestores,rallyReminderNavigates,rallyInvalidKeepsPet,rallyMarchRequiresRegenerate,rallyStopIsolated};
  }.toString()})(${JSON.stringify(rally.pets)})`);
  const updates=await win.webContents.executeJavaScript(`(${async function(){
    const state=await window.kingshotDesktop.getUpdateState();
    return {desktopUpdaterBridge:state.mode==='development'&&!!state.currentVersion,desktopUpdatePanel:!document.getElementById('desktop-updates').hidden,desktopSmokeCannotUpdate:document.getElementById('desktop-update-check').disabled&&!state.canInstall&&!state.canDownload};
  }.toString()})()`);
  return {...initial.checks,...after,...rally.checks,...rallyAfter,...updates};
};
