'use strict';
class AlarmQueue {
  constructor(){this.events=[];this.fired=new Set();}
  replace(events){
    if(!Array.isArray(events)||events.length>60)throw new TypeError('Invalid alarm list');
    this.events=events.map(e=>{
      if(!e||typeof e.id!=='string'||e.id.length>200||!Number.isFinite(e.at)||!Number.isFinite(e.expiresAt)||e.expiresAt<e.at||typeof e.title!=='string'||typeof e.body!=='string')throw new TypeError('Invalid alarm');
      return {id:e.id,at:e.at,expiresAt:e.expiresAt,title:e.title.slice(0,100),body:e.body.slice(0,200)};
    });
    const active=new Set(this.events.map(e=>e.id));
    this.fired=new Set([...this.fired].filter(id=>active.has(id)));
  }
  due(now){
    const due=[];
    for(const e of this.events)if(!this.fired.has(e.id)&&now>=e.at){this.fired.add(e.id);if(now<=e.expiresAt&&now-e.at<=1000)due.push(e);}
    return due;
  }
  clear(){this.events=[];this.fired.clear();}
}
module.exports={AlarmQueue};
