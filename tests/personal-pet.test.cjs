const {test}=require('node:test'),assert=require('node:assert/strict'),K=require('../dist/core.js');
test('personal pet suggests one march review per warning boundary without invalidating stored readings',()=>{
 const start=100000,pet=K.makePetEstimate(0,start),warn=start+115*60000,end=start+120*60000;
 assert.equal(K.petMarchReview(pet,start,warn-1),false);
 assert.equal(K.petMarchReview(pet,start,warn),true);
 assert.equal(K.petMarchReview(pet,warn,warn+1000),false);
 assert.equal(K.petMarchReview(pet,warn,end),true);
 assert.equal(K.petMarchReview(pet,end,end+1000),false);
 assert.equal(K.petMarchReview(null,NaN,end),false);
 assert.equal(pet.startedAt,start);
});
test('manual personal pet updates reset only that timer and survive reload, while clock changes require review',()=>{
 const first=K.makePetEstimate(30,10000000),restored=K.restorePetEstimate(JSON.parse(JSON.stringify(first)));
 assert.equal(K.petTiming(restored,10001000).remaining,5399);
 const updated=K.makePetEstimate(5,10001000);
 assert.equal(K.petTiming(updated,10001000).remaining,6900);
 assert.equal(K.petTiming(first,10001000).remaining,5399);
 assert.equal(K.petMarchReview({...updated,clockChanged:true},10001000,10001000),true);
 assert.throws(()=>K.makePetEstimate(121,10001000));
});
