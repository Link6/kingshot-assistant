'use strict';
// Real desktop IPC, loopback callback and Supabase SDK; no real browser or Discord account.
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {SUPABASE_URL}=require('./rooms-auth.cjs');
module.exports=async function roomSmoke(win,entry,auth){
  const originalOpen=auth.openExternal,originalFetch=auth.fetcher;
  const errors=[],opened=[];let challenge,exchanges=0,verified=0,room=null,denyMembership=false,settingsRequests=0;
  const now=()=>Date.now(),id='d7b72d6a-455b-4ee5-8237-cadf44fe096c';
  const user={id,aud:'authenticated',role:'authenticated',app_metadata:{provider:'discord'},user_metadata:{full_name:'Desktop Host'},identities:[{provider:'discord',identity_data:{sub:'123456789012345678'}}],created_at:new Date().toISOString()};
  const token=[{alg:'HS256',typ:'JWT'},{sub:id,role:'authenticated',exp:Math.floor(now()/1000)+3600},'fixture'].map(v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url')).join('.');
  const credentials={access_token:token,refresh_token:'fixture-refresh',provider_token:'fixture-discord-token',expires_in:3600,token_type:'bearer',user};
  const snapshot=()=>({...room,serverNow:now()});
  async function wait(expression){
    const end=now()+10000;
    while(now()<end){if(await win.webContents.executeJavaScript(expression))return;await new Promise(resolve=>setTimeout(resolve,25));}
    throw Error('Room smoke timeout: '+expression);
  }
  async function clickLogin(){
    const count=opened.length;
    await win.webContents.executeJavaScript("document.getElementById('room-panel').open=true;document.getElementById('room-login').click()");
    const end=now()+10000;
    while(now()<end){if(opened.length>count)return new URL(opened.at(-1));await new Promise(resolve=>setTimeout(resolve,25));}
    throw Error('System browser authorization was not requested');
  }
  async function returnCode(url){
    const response=await fetch(url.searchParams.get('redirect_to')+'&code=fixture-auth-code');
    assert.equal(response.status,200);assert.ok(!(await response.text()).includes('fixture-auth-code'));
  }
  try{
    await win.webContents.session.protocol.handle('https',async request=>{
      try{
        const url=new URL(request.url);
        if(url.origin!==SUPABASE_URL)throw Error('Unexpected network origin');
        let body={},status=200;
        if(request.method==='OPTIONS')status=204;
        else if(url.pathname==='/auth/v1/settings'){settingsRequests++;throw Error('Desktop must not wait for provider settings');}
        else if(url.pathname==='/auth/v1/token'){
          const requestBody=await request.json();
          if(url.searchParams.get('grant_type')==='pkce'){
            assert.equal(requestBody.auth_code,'fixture-auth-code');
            assert.equal(createHash('sha256').update(requestBody.code_verifier).digest('base64url'),challenge);exchanges++;
          }
          body=credentials;
        }else if(url.pathname==='/auth/v1/user')body=user;
        else if(url.pathname==='/auth/v1/logout')status=204;
        else if(url.pathname==='/rest/v1/rpc/kingshot_room'){
          const requestBody=await request.json(),action=requestBody.p_action;
          if(action==='access')body={allowed:true,serverNow:now()};
          else if(action==='owned')body=room?snapshot():{owned:false,serverNow:now()};
          else{
            if(action==='create')room={roomId:'6781f0a3-3bdd-4bf4-a867-48a72ec8ca85',code:'DESK1234',revision:1,expiresAt:now()+21600000,battle:{mode:'hold',revision:0,note:'',margin:0.2,marchCheckAt:now()},members:[{id,name:requestBody.p_data.name,role:'owner',march:35,marchUpdatedAt:now()}],leaders:[],enemies:[],plan:null,me:id};
            if(!['read','create'].includes(action))throw Error('Unexpected room action: '+action);
            body=snapshot();
          }
        }else throw Error('Unexpected room request: '+url.pathname);
        return new Response(status===204?null:JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Cache-Control':'no-store'}});
      }catch(err){errors.push(err.message);return new Response('{}',{status:500});}
    });
    win.webContents.session.webRequest.onBeforeRequest({urls:['wss://apthksvwesjebpguprvj.supabase.co/*']},(_request,callback)=>callback({cancel:true}));
    auth.fetcher=async(url,options)=>{
      assert.equal(url,SUPABASE_URL+'/functions/v1/discord-access');assert.equal(options.headers.Authorization,'Bearer '+token);
      assert.equal(JSON.parse(options.body).providerToken,credentials.provider_token);verified++;
      return {status:denyMembership?403:200};
    };
    auth.openExternal=async value=>{
      const url=new URL(value);assert.equal(url.origin,SUPABASE_URL);assert.equal(url.searchParams.get('provider'),'discord');
      assert.equal(new URL(url.searchParams.get('redirect_to')).hostname,'127.0.0.1');
      challenge=url.searchParams.get('code_challenge');opened.push(value);
    };
    await win.webContents.executeJavaScript('localStorage.clear();sessionStorage.clear()');await win.loadFile(entry);
    await wait("!document.getElementById('room-login').disabled");
    let url=await clickLogin();
    assert.equal(settingsRequests,0);assert.equal(require('electron').BrowserWindow.getAllWindows().length,1,'sign-in must use the external browser');
    assert.equal(await win.webContents.executeJavaScript("document.getElementById('room-cancel-login').hidden"),false);
    const wrong=new URL(url.searchParams.get('redirect_to'));wrong.searchParams.set('state','incorrect');
    const rejected=await fetch(wrong);assert.equal(rejected.status,400);await rejected.text();assert.ok(auth.pending);
    await win.webContents.executeJavaScript("document.getElementById('room-cancel-login').click()");
    await wait("!document.getElementById('room-login').disabled");assert.equal(auth.pending,null);
    url=await clickLogin();await returnCode(url);
    await wait("!document.getElementById('room-entry').hidden");assert.equal(exchanges,1);assert.ok(verified>0);
    await win.webContents.executeJavaScript("document.getElementById('room-create').click()");
    await wait("!document.getElementById('room-battle').hidden");assert.equal(room.code,'DESK1234');
    await win.loadFile(entry);await wait("!document.getElementById('room-battle').hidden");
    assert.equal(await win.webContents.executeJavaScript("document.getElementById('room-code').textContent"),'DESK1234');
    await win.webContents.executeJavaScript("document.getElementById('room-logout').click()");
    await wait("!document.getElementById('room-login').hidden");
    assert.equal(await win.webContents.executeJavaScript("Object.keys(sessionStorage).some(k=>k.endsWith(':discord'))"),false);
    denyMembership=true;url=await clickLogin();await returnCode(url);
    await wait("!document.getElementById('room-login').disabled&&document.getElementById('room-error').textContent.length>0");
    assert.equal(await win.webContents.executeJavaScript("document.getElementById('room-entry').hidden"),true);assert.deepEqual(errors,[]);
    return {desktopRoomLogin:true,desktopRoomPkce:true,desktopRoomCancel:true,desktopRoomSystemBrowser:true,desktopRoomLoopback:true,desktopRoomCreate:true,desktopRoomReload:true,desktopRoomLogout:true,desktopRoomMembership:true,desktopRoomNoPreflight:true};
  }finally{
    auth.cancel();auth.openExternal=originalOpen;auth.fetcher=originalFetch;
    await win.webContents.executeJavaScript('localStorage.clear();sessionStorage.clear()');
    win.webContents.session.protocol.unhandle('https');win.webContents.session.webRequest.onBeforeRequest(null);
  }
};
