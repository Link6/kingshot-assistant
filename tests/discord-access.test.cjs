const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const handler=()=>import(pathToFileURL(path.join(__dirname,'../supabase/functions/discord-access/handler.mjs')).href);
async function setup({memberStatus=200,discordId='123456789012345678',identityId='123456789012345678',authStatus=200}={}){
  const {createHandler}=await handler(),calls=[];
  const fetcher=async(url,options)=>{
    calls.push({url,options});
    if(url.endsWith('/auth/v1/user'))return Response.json({id:'verified-user',identities:[{provider:'discord',identity_data:{sub:identityId}}],user_metadata:{is_member:true}},{status:authStatus});
    if(url.endsWith('/users/@me'))return Response.json({id:discordId});
    if(url.includes('/guilds/'))return Response.json({user:{id:discordId}},{status:memberStatus});
    if(url.endsWith('/rpc/kingshot_discord_grant'))return new Response(null,{status:204});
    throw Error('Unexpected network call');
  };
  const run=createHandler({url:'https://test.supabase.co',publishableKey:'public',serviceKey:'server-secret',guildId:'1409235905629130915',fetcher});
  const request=(body={providerToken:'discord-oauth-token'},headers={})=>new Request('https://test.supabase.co/functions/v1/discord-access',{method:'POST',headers:{Origin:'https://link6.github.io',Authorization:'Bearer valid.user.token','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  return {run,calls,request};
}
test('Discord access verifies Supabase JWT and matching Discord identity before granting server membership',async()=>{
  const s=await setup(),response=await s.run(s.request({providerToken:'discord-oauth-token',guildId:'attacker-choice',allowed:true}));
  assert.equal(response.status,200);
  assert.ok(s.calls[2].url.includes('/1409235905629130915/member'));
  const grant=JSON.parse(s.calls[3].options.body);assert.equal(grant.p_user,'verified-user');assert.equal(grant.p_allowed,true);
  assert.equal(JSON.stringify(grant).includes('discord-oauth-token'),false);
});
test('another member provider token cannot be paired with a different Supabase user',async()=>{
  const s=await setup({discordId:'999999999999999999'});
  assert.equal((await s.run(s.request())).status,403);assert.equal(s.calls.length,2);
});
test('non-members have their prior database access grant revoked',async()=>{
  const s=await setup({memberStatus:404});assert.equal((await s.run(s.request())).status,403);
  assert.equal(JSON.parse(s.calls[3].options.body).p_allowed,false);
});
test('membership cannot be asserted using user-editable metadata or without Discord identity',async()=>{
  const s=await setup({identityId:'invalid'});assert.equal((await s.run(s.request())).status,403);assert.equal(s.calls.length,1);
});
test('invalid JWT, missing provider token and unapproved origins are rejected before membership lookup',async()=>{
  const s=await setup({authStatus:401});assert.equal((await s.run(s.request())).status,401);assert.equal(s.calls.length,1);
  const other=await setup();assert.equal((await other.run(other.request({},{}))).status,401);
  assert.equal((await other.run(other.request(undefined,{Origin:'https://unapproved.example'}))).status,403);assert.equal(other.calls.length,0);
});
test('Discord rate limiting does not issue a grant',async()=>{
  const s=await setup({memberStatus:429});assert.equal((await s.run(s.request())).status,429);assert.equal(s.calls.length,3);
});

test('desktop main-process requests without Origin still require matching identity and guild membership',async()=>{
  const s=await setup(),request=s.request();request.headers.delete('Origin');
  assert.equal((await s.run(request)).status,200);assert.equal(s.calls.length,4);
  const mismatch=await setup({discordId:'999999999999999999'}),other=mismatch.request();other.headers.delete('Origin');
  assert.equal((await mismatch.run(other)).status,403);assert.equal(mismatch.calls.length,2);
});
