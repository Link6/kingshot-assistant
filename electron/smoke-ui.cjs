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
  return {...initial.checks,...after};
};
