'use strict';
const {randomUUID,randomBytes}=require('node:crypto');
const {createServer}=require('node:http');
const SUPABASE_URL='https://apthksvwesjebpguprvj.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_xiJBGIUY24oM9GY7FaHkIw_u_pOXtUP';

function authorizeURL(value,redirectTo){
  if(typeof value!=='string'||value.length>2081)throw new Error('Invalid URL');
  const url=new URL(value),redirect=new URL(redirectTo);
  if(redirect.protocol!=='http:'||redirect.hostname!=='127.0.0.1'||!redirect.port||redirect.pathname!=='/discord/callback'||
    !/^[a-f0-9]{64}$/.test(redirect.searchParams.get('state')||''))throw new Error('Invalid callback');
  if(url.origin!==SUPABASE_URL||url.username||url.password||url.pathname!=='/auth/v1/authorize'||url.hash||
    url.searchParams.getAll('provider').length!==1||url.searchParams.get('provider')!=='discord'||
    url.searchParams.getAll('redirect_to').length!==1||url.searchParams.get('redirect_to')!==redirectTo||
    url.searchParams.get('code_challenge_method')!=='s256'||!/^[\w-]{43}$/.test(url.searchParams.get('code_challenge')||''))throw new Error('Invalid authorization URL');
  return url.href;
}
function callbackResult(value,expected){
  let url,redirect;try{url=new URL(value);redirect=new URL(expected);}catch{return null;}
  if(url.origin!==redirect.origin||url.pathname!==redirect.pathname||url.searchParams.getAll('state').length!==1||
    url.searchParams.get('state')!==redirect.searchParams.get('state'))return null;
  if(url.searchParams.has('error'))return {error:url.searchParams.get('error')==='access_denied'?'cancelled':'failed'};
  if(!url.searchParams.has('code'))return {error:'cancelled'}; // Provider errors can arrive in a fragment, which HTTP never sends.
  const code=url.searchParams.get('code');
  return url.searchParams.getAll('code').length===1&&/^[\w-]{1,2048}$/.test(code||'')?{code}:{error:'failed'};
}
function resultPage(result,language){
  const zh=language==='zh-CN',success=!!result.code;
  const title=success?(zh?'已返回 Kingshot Assistant':'Returned to Kingshot Assistant'):(zh?'登录未完成':'Sign-in did not complete');
  const message=success?(zh?'请回到桌面程序继续。此页面可以关闭。':'Return to the desktop app to continue. You can close this tab.'):(zh?'请回到桌面程序重试。此页面可以关闭。':'Return to the desktop app to retry. You can close this tab.');
  return '<!doctype html><html lang="'+(zh?'zh-CN':'en')+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kingshot Assistant</title><style>:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#11171b;color:#e9ecef}body{margin:0;min-height:100vh;display:grid;place-items:center}main{max-width:460px;padding:32px;text-align:center}h1{font-size:24px;color:#d7b777}p{line-height:1.7}</style><main><h1>'+title+'</h1><p>'+message+'</p></main></html>';
}
class DesktopRoomAuth{
  constructor({parent,openExternal,fetcher=fetch,timeoutMs=180000}){
    this.parent=parent;this.openExternal=openExternal;this.fetcher=fetcher;this.timeoutMs=timeoutMs;this.pending=null;
  }
  async prepare(language){
    if(this.pending)return {error:'busy'};
    let resolveResult;
    const attempt={id:randomUUID(),language,started:false,result:new Promise(resolve=>resolveResult=resolve)};
    const server=createServer({maxHeaderSize:8192,requestTimeout:5000,headersTimeout:5000,keepAliveTimeout:1000},(request,response)=>{
      const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
        'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",Connection:'close'};
      const reject=()=>{response.writeHead(400,headers);response.end('Invalid callback');};
      if(!attempt.started||request.method!=='GET'||request.headers.host!==new URL(attempt.redirectTo).host||request.headers.origin)return reject();
      let result;try{result=callbackResult(new URL(request.url,attempt.redirectTo).href,attempt.redirectTo);}catch{return reject();}
      if(!result)return reject();
      response.writeHead(200,headers);response.end(resultPage(result,language),()=>attempt.finish(result));
    });
    attempt.finish=result=>{
      if(attempt.settled)return;attempt.settled=true;clearTimeout(attempt.timer);
      attempt.cancelOpening?.();
      if(this.pending===attempt)this.pending=null;
      server.close();server.closeIdleConnections();
      const parent=this.parent();if(parent&&!parent.isDestroyed()){if(parent.isMinimized())parent.restore();parent.focus();}
      resolveResult(result);
    };
    this.pending=attempt;
    attempt.timer=setTimeout(()=>attempt.finish({error:'timeout'}),this.timeoutMs);attempt.timer.unref?.();
    try{
      await new Promise((resolve,reject)=>{
        attempt.cancelOpening=()=>reject(Error('Cancelled'));server.once('error',reject);
        server.listen({host:'127.0.0.1',port:0,exclusive:true},()=>{if(attempt.settled){server.close();reject(Error('Cancelled'));}else resolve();});
      });
      attempt.cancelOpening=null;
      server.on('error',()=>attempt.finish({error:'failed'}));
      if(attempt.settled){server.close();return {error:'cancelled'};}
      attempt.redirectTo='http://127.0.0.1:'+server.address().port+'/discord/callback?state='+randomBytes(32).toString('hex');
      return {id:attempt.id,redirectTo:attempt.redirectTo};
    }catch{if(attempt.settled)return {error:'cancelled'};attempt.finish({error:'failed'});return {error:'failed'};}
  }
  async login(value,id){
    const attempt=this.pending;
    if(!attempt||attempt.id!==id)return {error:'cancelled'};
    if(attempt.started)return {error:'busy'};
    let url;try{url=authorizeURL(value,attempt.redirectTo);}catch{attempt.finish({error:'failed'});return attempt.result;}
    attempt.started=true;
    try{await this.openExternal(url);}catch{attempt.finish({error:'failed'});}
    return attempt.result;
  }
  cancel(id){if(id===undefined||this.pending?.id===id)this.pending?.finish({error:'cancelled'});}
  async verify({accessToken,providerToken}={}){
    if(typeof accessToken!=='string'||accessToken.length>16384||!/^Bearer [\w.-]+$/.test('Bearer '+accessToken)||
      typeof providerToken!=='string'||providerToken.length<10||providerToken.length>2048)return {status:401};
    try{
      const response=await this.fetcher(SUPABASE_URL+'/functions/v1/discord-access',{
        method:'POST',headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},
        body:JSON.stringify({providerToken}),redirect:'error',signal:AbortSignal.timeout(15000)});
      return {status:response.status};
    }catch{return {status:503};}
  }
}
module.exports={DesktopRoomAuth,SUPABASE_URL,authorizeURL,callbackResult};
