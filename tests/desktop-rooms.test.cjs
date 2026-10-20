const {test}=require('node:test'),assert=require('node:assert/strict');
const {DesktopRoomAuth,SUPABASE_URL,authorizeURL,callbackResult}=require('../electron/rooms-auth.cjs');
const redirect='http://127.0.0.1:43891/discord/callback?state='+'a'.repeat(64);
const authURL=callback=>SUPABASE_URL+'/auth/v1/authorize?'+new URLSearchParams({provider:'discord',redirect_to:callback,code_challenge:'a'.repeat(43),code_challenge_method:'s256'});
function fixture(options={}){
  const opened=[],parent={isDestroyed:()=>false,isMinimized:()=>false,focus(){this.focused=true;}};
  const manager=new DesktopRoomAuth({parent:()=>parent,openExternal:async url=>opened.push(url),...options});
  return {manager,opened,parent};
}
test('external authorization permits only Discord, the expected loopback callback, and PKCE',()=>{
  assert.equal(authorizeURL(authURL(redirect),redirect),authURL(redirect));
  for(const modify of [u=>u.host='evil.example',u=>u.protocol='http:',u=>u.searchParams.set('provider','github'),u=>u.searchParams.append('provider','github'),u=>u.searchParams.set('redirect_to','https://evil.example/'),u=>u.searchParams.delete('code_challenge'),u=>u.searchParams.set('code_challenge_method','plain'),u=>u.username='someone',u=>u.hash='access_token=secret']){
    const url=new URL(authURL(redirect));modify(url);assert.throws(()=>authorizeURL(url.href,redirect));
  }
  assert.throws(()=>authorizeURL(authURL('http://evil.example/'), 'http://evil.example/'));
  assert.equal(callbackResult(redirect.replace('127.0.0.1','evil.example')+'&code=test',redirect),null);
  assert.equal(callbackResult(redirect.replace('/discord/callback','/other')+'&code=test',redirect),null);
  assert.equal(callbackResult(redirect.replace('a'.repeat(64),'b'.repeat(64))+'&code=test',redirect),null);
  assert.deepEqual(callbackResult(redirect+'&code=one&code=two',redirect),{error:'failed'});
  assert.deepEqual(callbackResult(redirect+'&error=access_denied',redirect),{error:'cancelled'});
});
test('system browser receives authorization URL; valid callback returns only a code and closes the listener',async()=>{
  const f=fixture(),attempt=await f.manager.prepare('zh-CN');
  assert.equal(new URL(attempt.redirectTo).hostname,'127.0.0.1');
  const result=f.manager.login(authURL(attempt.redirectTo),attempt.id);
  assert.deepEqual(f.opened,[authURL(attempt.redirectTo)]);
  const response=await fetch(attempt.redirectTo+'&code=valid-one-time-code');
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.match(response.headers.get('content-security-policy'),/default-src 'none'/);
  const html=await response.text();assert.match(html,/Kingshot Assistant/);assert.ok(!html.includes('valid-one-time-code'));
  assert.deepEqual(await result,{code:'valid-one-time-code'});assert.equal(f.parent.focused,true);assert.equal(f.manager.pending,null);
  await assert.rejects(fetch(attempt.redirectTo+'&code=replay',{signal:AbortSignal.timeout(1000)}));
});
test('unknown state, wrong path, POST and cross-origin callbacks cannot consume an attempt',async()=>{
  const f=fixture(),attempt=await f.manager.prepare('en'),result=f.manager.login(authURL(attempt.redirectTo),attempt.id);
  try{
    for(const [url,options] of [[attempt.redirectTo.replace('state=','state=wrong'),{}],[attempt.redirectTo.replace('/discord/callback','/other'),{}],[attempt.redirectTo,{method:'POST'}],[attempt.redirectTo,{headers:{Origin:'https://evil.example'}}]]){
      const response=await fetch(url,options);assert.equal(response.status,400);await response.text();assert.ok(f.manager.pending);
    }
    const response=await fetch(attempt.redirectTo+'&code=expected');await response.text();assert.deepEqual(await result,{code:'expected'});
  }finally{f.manager.cancel();await result;}
});
test('cancel, provider refusal, timeout, browser failure and invalid URLs permit a clean retry',async()=>{
  for(const mode of ['cancel','refuse','timeout','browser','invalid']){
    const f=fixture({timeoutMs:mode==='timeout'?15:180000,...(mode==='browser'?{openExternal:async()=>{throw Error('No browser');}}:{})});
    const attempt=await f.manager.prepare('en'),result=f.manager.login(mode==='invalid'?'https://evil.example':authURL(attempt.redirectTo),attempt.id);
    if(mode==='cancel')f.manager.cancel(attempt.id);
    if(mode==='refuse'){const response=await fetch(attempt.redirectTo+'&error=access_denied');await response.text();}
    assert.deepEqual(await result,{error:['cancel','refuse'].includes(mode)?'cancelled':mode==='timeout'?'timeout':'failed'});
    const retry=await f.manager.prepare('en');assert.notEqual(retry.redirectTo,attempt.redirectTo);
    f.manager.cancel(attempt.id);assert.ok(f.manager.pending,'late cancellation cannot stop a new attempt');f.manager.cancel(retry.id);
  }
});
test('duplicate preparation and browser launches never create concurrent flows',async()=>{
  const f=fixture(),attempt=await f.manager.prepare('en');
  assert.deepEqual(await f.manager.prepare('en'),{error:'busy'});
  const result=f.manager.login(authURL(attempt.redirectTo),attempt.id);
  assert.deepEqual(await f.manager.login(authURL(attempt.redirectTo),attempt.id),{error:'busy'});
  assert.equal(f.opened.length,1);f.manager.cancel();await result;
});
test('cancellation while the loopback listener is opening does not leave an orphan listener',async()=>{
  const f=fixture(),preparing=f.manager.prepare('en');f.manager.cancel();assert.deepEqual(await preparing,{error:'cancelled'});assert.equal(f.manager.pending,null);
});
test('desktop membership verification calls only the configured endpoint and preserves server refusal',async()=>{
  const calls=[],f=fixture({fetcher:async(...args)=>{calls.push(args);return {status:403};}});
  assert.deepEqual(await f.manager.verify({accessToken:'valid.jwt.token',providerToken:'discord-token'}),{status:403});
  assert.equal(calls[0][0],SUPABASE_URL+'/functions/v1/discord-access');assert.equal(calls[0][1].headers.Authorization,'Bearer valid.jwt.token');assert.equal(calls[0][1].redirect,'error');
  assert.equal(calls[0][1].headers.Origin,undefined);assert.ok(calls[0][1].headers.apikey.startsWith('sb_publishable_'));
  assert.deepEqual(JSON.parse(calls[0][1].body),{providerToken:'discord-token'});
  for(const tokens of [{},{accessToken:'x\r\nOrigin: evil',providerToken:'discord-token'},{accessToken:'valid',providerToken:'x'.repeat(2049)}])assert.deepEqual(await f.manager.verify(tokens),{status:401});
  assert.equal(calls.length,1);
  const broken=fixture({fetcher:async()=>{throw Error('offline');}});
  assert.deepEqual(await broken.manager.verify({accessToken:'valid',providerToken:'discord-token'}),{status:503});
});
