// Provider tokens are verified against the authenticated Supabase identity,
// used only for this request, and never written to the database or logs.
export function createHandler({url,publishableKey,serviceKey,guildId,fetcher=fetch}){
  const origins=new Set(['https://link6.github.io','http://localhost:4173','http://127.0.0.1:4173']);
  return async request=>{
    const origin=request.headers.get('origin');
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
      'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
    if(origin&&origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
    const reply=(status,code)=>new Response(JSON.stringify(typeof code==='string'?{error:code}:code),{status,headers});
    if(origin&&!origins.has(origin))return reply(403,'ORIGIN');
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return reply(405,'METHOD');
    if(!url||!publishableKey||!serviceKey||!/^\d{15,22}$/.test(guildId||''))return reply(503,'NOT_CONFIGURED');
    const authorization=request.headers.get('authorization')||'';
    if(!/^Bearer [\w.-]+$/.test(authorization))return reply(401,'LOGIN');
    const call=(path,options={})=>fetcher(url+path,{...options,signal:AbortSignal.timeout(8000)});
    let body;
    try{const text=await request.text();if(text.length>4096)return reply(413,'SIZE');body=JSON.parse(text);}catch{return reply(400,'INPUT');}
    if(typeof body.providerToken!=='string'||body.providerToken.length<10||body.providerToken.length>2048)return reply(401,'DISCORD_LOGIN');
    try{
      const auth=await call('/auth/v1/user',{headers:{apikey:publishableKey,Authorization:authorization}});
      if(!auth.ok)return reply(401,'LOGIN');
      const user=await auth.json();
      const identity=user.identities?.find(i=>i.provider==='discord');
      const discordId=[identity?.provider_id,identity?.identity_data?.provider_id,identity?.identity_data?.sub,identity?.id].find(id=>/^\d{15,22}$/.test(id||''));
      if(!user.id||!discordId)return reply(403,'DISCORD_IDENTITY');
      const discordHeaders={Authorization:'Bearer '+body.providerToken};
      const discordUser=await fetcher('https://discord.com/api/v10/users/@me',{headers:discordHeaders,signal:AbortSignal.timeout(8000)});
      if(!discordUser.ok)return reply(discordUser.status===429?429:401,'DISCORD_LOGIN');
      if((await discordUser.json()).id!==discordId)return reply(403,'IDENTITY_MISMATCH');
      const member=await fetcher(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,{headers:discordHeaders,signal:AbortSignal.timeout(8000)});
      if(member.status===429)return reply(429,'RATE');
      if(!member.ok&&member.status!==404&&member.status!==403)return reply(503,'DISCORD_UNAVAILABLE');
      const allowed=member.ok;
      const grant=await call('/rest/v1/rpc/kingshot_discord_grant',{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},
        body:JSON.stringify({p_user:user.id,p_discord:discordId,p_guild:guildId,p_allowed:allowed})});
      if(!grant.ok)return reply(503,'GRANT');
      if(!allowed)return reply(403,'NOT_MEMBER');
      return reply(200,{allowed:true,expiresAt:Date.now()+5*60000});
    }catch{return reply(503,'UNAVAILABLE');}
  };
}
