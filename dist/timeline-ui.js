(function(){
  'use strict';
  const K=window.KingshotTiming,I=window.KingshotI18n,UI=window.KingshotBattleUI,t=(k,p)=>I.t(k,p),esc=UI.esc;
  function create(container,mode){
    let data={},items=[],signature='',choice='auto',span=60000,autoKey='',width=0,lastTime=null,selected=null;
    const observer=new ResizeObserver(entries=>{width=entries[0].contentRect.width;if(lastTime!==null)paint(lastTime);});
    const duration=value=>I.number(Math.round(value*10)/10)+' '+t('seconds');
    const pointDetail=(name,kind,at)=>t('roomTimelinePointDetail',{name,kind:t(kind),time:K.formatUtc(at)});
    const phaseDetail=(name,phase,start,end)=>t('roomTimelinePhaseDetail',{name,phase:t(phase),start:K.formatUtc(start),end:K.formatUtc(end)});
    const gapDetail=(w,kind,start,end)=>w.usable?t('battleRange',{kind:t(kind),before:w.before.name,after:w.after.name,start:K.formatUtc(start),end:K.formatUtc(end),width:duration((end-start)/1000)})+(end-start<1000?' · '+t('hospitalWarning'):''):t('battleBlockedDetail',{before:w.before.name,after:w.after.name});
    function item({key,start,end=start,kind,text='',detail,point=false}){
      const index=items.length;items.push({key,start,end,kind,detail,point});
      return `<button type="button" class="${point?'room-time-marker':'battle-band room-time-band'} ${kind}" data-timeline-index="${index}" title="${esc(detail)}" aria-label="${esc(detail)}" hidden>${point?'<i></i>':esc(text)}</button>`;
    }
    const lane=(label,content,own=false)=>`<div class="battle-row room-time-row ${own?'my-leader':''}"><span class="battle-label" title="${esc(label)}">${esc(label)}${own?`<small>${t('roomTimelineOwn')}</small>`:''}</span><div class="battle-track">${content}</div></div>`;
    function build(){
      items=[];
      let lanes='';
      if(mode==='attack'){
        const gaps=K.rallyGaps(data.rows,0);
        lanes+=lane(t('roomTimelineGaps'),gaps.map(g=>item({key:'gap:'+g.before.id+':'+g.after.id,start:g.start,end:g.end,kind:!g.usable?'blocked':g.safeWidth<1?'narrow':'arrival',text:g.usable?duration(g.safeWidth):'—',detail:g.usable?t('attackGapDetail',{before:g.before.name,after:g.after.name,seconds:I.number(g.width),start:K.formatUtc(g.start),end:K.formatUtc(g.end)}):g.before.name+' → '+g.after.name+' · '+t('noInsertionWindow')})).join(''));
        lanes+=data.rows.map(r=>{
          const departAt=r.launchAt+r.prepareSeconds*1000;
          return lane(r.name,
            item({key:r.id+':gather',start:r.launchAt,end:departAt,kind:'gather room-phase',text:t('roomTimelineGather'),detail:phaseDetail(r.name,'roomTimelineGather',r.launchAt,departAt)})+
            item({key:r.id+':march',start:departAt,end:r.arrivalAt,kind:'march room-phase',text:t('roomTimelineMarch'),detail:phaseDetail(r.name,'roomTimelineMarch',departAt,r.arrivalAt)})+
            item({key:r.id+':launch',start:r.launchAt,kind:'launch',point:true,detail:pointDetail(r.name,'roomTimelineLaunch',r.launchAt)})+
            item({key:r.id+':arrival',start:r.arrivalAt,kind:'allied',point:true,detail:pointDetail(r.name,'roomTimelineLanding',r.arrivalAt)}),r.userId===data.me);
        }).join('');
      }else{
        const gaps=K.rallyGaps(data.records,data.margin);
        lanes+=lane(t('roomTimelineNormal'),data.confirmed?data.windows.filter(w=>w.usable).map(w=>item({key:'normal:'+w.id,start:w.start,end:w.end,kind:w.narrow?'narrow':'departure',text:duration(w.width),detail:gapDetail(w,'roomTimelineNormal',w.start,w.end)})).join(''):'');
        lanes+=lane(t('roomTimelineBoost'),(data.boosts||[]).filter(a=>!a.normal&&a.recommended?.count).map(a=>{
          const p=a.recommended,w=a.window;
          return item({key:'boost:'+w.id,start:p.start,end:p.end,kind:'boosted',text:UI.boostItems(p),detail:gapDetail(w,'roomTimelineBoost',p.start,p.end)+' · '+t('boostRecommend',{items:UI.boostItems(p)})});
        }).join(''));
        lanes+=lane(t('battleArrival'),gaps.map(g=>item({key:'arrival:'+g.before.id+':'+g.after.id,start:g.usable?g.start:g.before.arrivalAt,end:g.usable?g.end:g.after.arrivalAt,kind:!g.usable?'blocked':g.safeWidth<1?'narrow':'arrival',text:g.usable?duration(g.safeWidth):'—',detail:gapDetail(g,'battleArrival',g.start,g.end)})).join(''));
        lanes+=data.records.map(r=>lane(r.name,item({key:r.id+':enemy',start:r.arrivalAt,kind:'enemy',point:true,detail:pointDetail(r.name,'battleAttack',r.arrivalAt)}))).join('');
      }
      const legend=mode==='attack'?[['launch','roomTimelineLaunch'],['gather','roomTimelineGather'],['march','roomTimelineMarch'],['arrival','roomTimelineLanding']]:[['attack','battleAttack'],['departure','roomTimelineNormal'],['boosted','roomTimelineBoost'],['arrival','battleArrival']];
      const records=mode==='attack'?data.rows:data.records;
      container.innerHTML=`<div class="panel-header"><h2 id="${container.id}-title">${t('battleTitle')}</h2><label class="room-time-range">${t('roomTimelineRange')}<select data-timeline-span>${['auto',60,180,360,600].map(v=>`<option value="${v}" ${String(v)===choice?'selected':''}>${v==='auto'?t('roomTimelineAuto'):v===60?t('roomTimelineSeconds',{n:60}):t('roomTimelineMinutes',{n:v/60})}</option>`).join('')}</select></label></div><p class="panel-caption">${t(mode==='attack'?'roomTimelineAttackHint':'roomTimelineDefenseHint')}</p><div class="battle-legend">${[...legend,['narrow','battleNarrow'],['blocked',mode==='attack'?'noArrivalGap':'battleBlocked']].map(([kind,label])=>`<span><i class="battle-key ${kind}"></i>${t(label)}</span>`).join('')}</div><p class="result-placeholder" ${records.length?'hidden':''}>${t(mode==='attack'?'waitPublishedPlan':'battleEmpty')}</p><div class="room-time-chart" data-timeline-chart ${records.length?'':'hidden'}><div class="battle-row battle-axis"><span class="battle-label">${t('battleNow')}</span><div class="battle-track" data-timeline-scale>${[0,0.25,0.5,0.75,1].map(f=>`<span style="left:${f*100}%">${f?'+'+UI.countdown(span*f/1000).split('.')[0]:'0'}</span>`).join('')}</div></div>${lanes}</div><p class="battle-status" data-timeline-status></p><p class="battle-detail" data-timeline-detail></p>`;
      items.forEach((entry,i)=>entry.node=container.querySelector(`[data-timeline-index="${i}"]`));
      showDetail();observer.disconnect();observer.observe(container.querySelector('[data-timeline-scale]'));
    }
    function showDetail(){
      const current=items.find(i=>i.key===selected);
      container.querySelector('[data-timeline-detail]').textContent=current?.detail||t('roomTimelineDetail');
    }
    function paint(time){
      for(const entry of items){
        const range=entry.kind.includes('room-phase')&&entry.end<=entry.start?null:entry.point?(entry.start>=time&&entry.start<=time+span?{left:(entry.start-time)/span*100}:null):K.timelineRange(entry.start,entry.end,time,span);
        if(entry.node.hidden!==!range)entry.node.hidden=!range;
        if(!range)continue;
        entry.node.style.transform=`translateX(${range.left/100*width}px)`;
        if(!entry.point)entry.node.style.width=range.width+'%';
        entry.node.classList.toggle('open',!entry.point&&time>=entry.start&&time<entry.end);
      }
    }
    function update(next,time){
      data={...next,rows:next.rows||[],records:(next.records||[]).filter(r=>r.active!==false),windows:next.windows||[],margin:next.margin??0.2};
      const key=JSON.stringify(data.rows.map(r=>[r.id,r.launchAt,r.arrivalAt]));
      if(choice==='auto'){
        if(mode==='defend')span=60000;
        else if(key!==autoKey)span=Math.max(60000,Math.ceil((Math.max(time,...data.rows.map(r=>r.arrivalAt))-time)/60000)*60000);
      }else span=Number(choice)*1000;
      autoKey=key;
      const nextSignature=JSON.stringify([I.language,choice,span,data.rows,data.records,data.windows,data.margin,data.me,data.confirmed,(data.boosts||[]).map(a=>[a.window.id,!!a.normal,a.recommended&&[a.recommended.n25,a.recommended.n50,a.recommended.start,a.recommended.end]])]);
      if(signature!==nextSignature){signature=nextSignature;build();}
      container.classList.toggle('timeline-paused',!!data.paused);
      if(!data.paused||lastTime===null)lastTime=time;
      paint(lastTime);
      const records=mode==='attack'?data.rows:data.records,arrivals=records.filter(r=>r.arrivalAt>=time&&r.arrivalAt<=time+span),nextArrival=records.filter(r=>r.arrivalAt>time).sort((a,b)=>a.arrivalAt-b.arrivalAt)[0];
      let status=data.paused?t(data.paused):t('roomTimelineStatus',{time:K.formatUtc(time,false),seconds:I.number(span/1000),n:arrivals.length});
      if(!data.paused){
        if(!arrivals.length&&nextArrival)status+=' · '+t('roomTimelineLater',{time:UI.countdown((nextArrival.arrivalAt-time)/1000)});
        else if(records.length&&!nextArrival)status+=' · '+t('roomTimelineFinished');
        if(mode==='defend'&&!data.confirmed)status+=' · '+t('marchNeedsCheck');
      }
      const node=container.querySelector('[data-timeline-status]');if(node.textContent!==status)node.textContent=status;
    }
    container.addEventListener('click',e=>{const node=e.target.closest('[data-timeline-index]');if(node){selected=items[Number(node.dataset.timelineIndex)]?.key;showDetail();}});
    container.addEventListener('change',e=>{if(e.target.matches('[data-timeline-span]')){choice=e.target.value;autoKey='';update(data,lastTime??Date.now());}});
    return {update,frame(time){if(!data.paused){lastTime=time;paint(time);}}};
  }
  window.KingshotRoomTimeline={create};
})();
