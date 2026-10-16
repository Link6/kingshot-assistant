const {test}=require('node:test');
const assert=require('node:assert/strict');
const {guardWindows,battleTimeline,recordEnemy,adjustEnemy}=require('../dist/core.js');
const a={id:'a',arrivalAt:120000},b={id:'b',arrivalAt:128000};
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('departure and arrival tracks share the same 60-second scale, with march time deducted once',()=>{
  const windows=guardWindows([b,a],'5','1');
  const view=battleTimeline([b,a],windows,100000);
  assert.deepEqual(view.attacks.map(x=>x.record.id),['a','b']);
  close(view.attacks[0].left,100/3);
  close(view.windows[0].departure.left,16/60*100);
  close(view.windows[0].arrival.left,21/60*100);
  close(view.windows[0].departure.width,10);
  close(view.windows[0].arrival.width,10);
  assert.equal(windows[0].start,116000);
});

test('clips ongoing windows and windows crossing the horizon without creating negative widths',()=>{
  const windows=guardWindows([a,b],'5','1');
  const active=battleTimeline([a,b],windows,118000).windows[0];
  assert.equal(active.departure.left,0);
  close(active.departure.width,4/60*100);
  close(active.arrival.left,3/60*100);
  const future=battleTimeline([a,b],windows,65000).windows[0];
  close(future.arrival.left,56/60*100);
  close(future.arrival.width,4/60*100);
  assert.equal(battleTimeline([a,b],windows,127000).windows[0].arrival,null);
  assert.equal(battleTimeline([a,b],windows,122000).windows[0].departure,null);
});

test('an arrival window can remain after the departure window has expired',()=>{
  const view=battleTimeline([a,b],guardWindows([a,b],'5','1'),124000);
  assert.equal(view.attacks[0].visible,false);
  assert.equal(view.attacks[1].visible,true);
  assert.equal(view.windows[0].departure,null);
  assert.equal(view.windows[0].arrival.left,0);
  close(view.windows[0].arrival.width,5);
});

test('unusable gaps never produce departure bands, while narrow windows retain their warning',()=>{
  for(const gap of [0,100,400,401,1399,1400]){
    const records=[a,{...b,arrivalAt:a.arrivalAt+gap}],windows=guardWindows(records,'5','0.2');
    const view=battleTimeline(records,windows,100000).windows[0];
    assert.equal(!!view.departure,gap>400);
    assert.equal(view.window.narrow,gap>400&&gap<1400);
    assert.ok(view.arrival.width>=0);
  }
});

test('fine adjustments reorder attacks and immediately move their window positions',()=>{
  const first=recordEnemy({id:'a',name:'A',mode:'marching',march:'20'},100000);
  const second=recordEnemy({id:'b',name:'B',mode:'marching',march:'20.5'},100000);
  const adjusted=adjustEnemy(first,'march',1,100000);
  const view=battleTimeline([adjusted,second],guardWindows([adjusted,second],'5','0.2'),100000);
  assert.deepEqual(view.attacks.map(x=>x.record.id),['b','a']);
  assert.equal(view.windows[0].window.before.id,'b');
  assert.equal(view.windows[0].window.narrow,true);
  close(view.windows[0].departure.left,15.7/60*100);
});

test('empty, distant, coincident, and boundary arrivals are represented without mutating records',()=>{
  assert.deepEqual(battleTimeline([],[],100000),{attacks:[],windows:[]});
  const records=[{id:'far',arrivalAt:160001},{id:'edge',arrivalAt:160000},{id:'now',arrivalAt:100000},{id:'past',arrivalAt:99999}];
  const copy=structuredClone(records),view=battleTimeline(records,[],100000);
  assert.deepEqual(view.attacks.map(x=>x.visible),[false,true,true,false]);
  assert.deepEqual(records,copy);
});
