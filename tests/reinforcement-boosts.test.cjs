const {test}=require('node:test');
const assert=require('node:assert/strict');
const K=require('../dist/core.js');
const windows=(start,end,march=40,margin=0.2)=>K.guardWindows([{id:'a',name:'A',arrivalAt:start*1000},{id:'b',name:'B',arrivalAt:end*1000}],march,margin);

test('a missed normal departure retains its landing window and chooses the fewest items',()=>{
  const input=windows(24,26),copy=structuredClone(input);
  assert.equal(K.nextWindow(input,0),null);
  const [a]=K.reinforcementBoosts(input,40,0);
  assert.equal(a.normal,null);
  assert.deepEqual([a.recommended.n25,a.recommended.n50,a.recommended.count],[0,1,1]);
  assert.equal(a.recommended.seconds,20.5);
  assert.equal(a.only25.count,2);
  assert.ok(a.recommended.midpoint+a.recommended.seconds*1000>a.window.arrivalStart);
  assert.ok(a.recommended.midpoint+a.recommended.seconds*1000<a.window.arrivalEnd);
  assert.deepEqual(input,copy);
});

test('stacked reductions apply to remaining time and account for every operation',()=>{
  const [slow]=K.reinforcementBoosts(windows(8,12),40,0,{delay:1});
  assert.deepEqual([slow.recommended.n25,slow.recommended.n50],[1,2]);
  assert.equal(slow.recommended.seconds,3+(((40-1)*0.5-1)*0.5-1)*0.75);
  assert.equal(slow.only50.count,3);
  const [fast]=K.reinforcementBoosts(windows(8,12),40,0,{delay:0.1});
  assert.equal(fast.recommended.count,2);
  assert.equal(fast.recommended.n50,2);
  // Two 50% items never remove the whole march, and launch preparation also takes time.
  assert.ok(fast.recommended.seconds>10);
  assert.ok(fast.recommended.availableStart>=100);
});

test('prefer fewer 50 percent items only when total item counts tie',()=>{
  const [a]=K.reinforcementBoosts(windows(22,26,30),30,0);
  assert.equal(a.recommended.n25,1);
  assert.equal(a.recommended.n50,0);
  assert.equal(a.only50.count,1);
  assert.equal(K.reinforcementBoosts(windows(50,55),40,0)[0].recommended.count,0);
});

test('inventory excludes unavailable items without hiding still-open landing windows',()=>{
  const input=windows(24,26);
  const [onlySmall]=K.reinforcementBoosts(input,40,0,{stock50:0});
  assert.equal(onlySmall.recommended.n25,2);
  assert.equal(onlySmall.only50,null);
  const [none]=K.reinforcementBoosts(input,40,0,{stock25:1,stock50:0});
  assert.equal(none.recommended,null);
  assert.equal(none.window.arrivalEnd,25800);
  assert.equal(K.reinforcementBoosts(input,40,25800).length,0);
});

test('exclusive end boundaries, margins and cancelled enemies never produce false opportunities',()=>{
  const w=windows(24,26)[0],p=K.reinforcementBoosts([w],40,0,{stock25:0,stock50:1})[0].recommended;
  const latest=w.arrivalEnd-p.seconds*1000-1000;
  assert.ok(K.reinforcementBoosts([w],40,latest-1,{stock25:0,stock50:1})[0].recommended);
  assert.equal(K.reinforcementBoosts([w],40,latest,{stock25:0,stock50:1})[0].recommended,null);
  assert.deepEqual(K.reinforcementBoosts(windows(24,24.4),40,0),[]);
  const stopped=K.guardWindows([{id:'a',arrivalAt:24000},{id:'b',arrivalAt:26000,active:false}],40,0.2);
  assert.deepEqual(K.reinforcementBoosts(stopped,40,0),[]);
  const [late]=K.reinforcementBoosts(windows(24,26),40,25799);
  assert.equal(late.recommended,null);
});

test('bounded input validation and very short marches do not invent useful extra items',()=>{
  for(const options of [{delay:0},{delay:0.01},{delay:31},{stock25:-1},{stock50:'1.5'},{stock50:NaN},{stock25:10000}])assert.throws(()=>K.reinforcementBoosts(windows(24,26),40,0,options));
  assert.throws(()=>K.reinforcementBoosts(windows(24,26),40,NaN));
  const [short]=K.reinforcementBoosts(windows(0.1,0.3,0.05,0),0.05,0,{delay:0.1});
  assert.equal(short.recommended.count,0);
  assert.equal(short.only25.count,0);
});

test('recommendations agree with exhaustive item-order search across small inventories and deadlines',()=>{
  for(const march of [6,15,40])for(const end of [3,5,8,12,20])for(const stock25 of [0,1,3])for(const stock50 of [0,1,3]){
    const window=windows(end-1,end,march,0.1)[0];
    const candidates=[];
    function visit(remaining,elapsed,n25,n50){
      const seconds=elapsed+remaining;
      if(Math.max(window.arrivalStart-seconds*1000,1000)<window.arrivalEnd-seconds*1000)candidates.push({count:n25+n50,n25,n50,seconds});
      if(remaining<=1)return;
      if(n25<stock25)visit((remaining-1)*0.75,elapsed+1,n25+1,n50);
      if(n50<stock50)visit((remaining-1)*0.5,elapsed+1,n25,n50+1);
    }
    visit(march,0,0,0);
    candidates.sort((a,b)=>a.count-b.count||a.n50-b.n50||a.seconds-b.seconds);
    const actual=K.reinforcementBoosts([window],march,0,{stock25,stock50})[0].recommended,expected=candidates[0];
    assert.equal(actual?.count,expected?.count);
    assert.equal(actual?.n50,expected?.n50);
    if(actual)assert.ok(Math.abs(actual.seconds-expected.seconds)<1e-9);
  }
});
