// Each project on the same github.io origin owns only its own cache namespace.
const PREFIX=`kingshot:${self.registration.scope}:`;
const CACHE=PREFIX+'web-6aef59a5346c1ce8';
const ASSETS=['./','./index.html','./assets/i18n-b8470770727a0371.js','./assets/install-ff9ccd4e38b61f8b.js','./assets/core-973244d550a279c7.js','./assets/battle-ui-7fcadaaa8f18c833.js','./assets/timeline-ui-9bfee9e5a3a553e6.js','./assets/app-3267120dbe4de70e.js','./assets/styles-54cc676d88b81089.css','./assets/supabase-ee3be8de192b97cb.js','./assets/roomconfig-f4b9c6854684fe8f.js','./assets/rooms-c8a214a7a680f4be.js','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./manifest.webmanifest','./manifest.en.webmanifest'];
const URLs=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).href));
async function installSnapshot(){
  const cache=await caches.open(CACHE);
  await cache.addAll(ASSETS.map(p=>new Request(new URL(p,self.registration.scope),{cache:'reload'})));
  const html=await (await cache.match(new URL('./index.html',self.registration.scope))).text();
  for(const asset of ASSETS.filter(p=>p.startsWith('./assets/'))){
    if(!html.includes('"'+asset.slice(2)+'"'))throw new Error('Offline HTML and assets are from different builds');
  }
  await self.skipWaiting();
}
self.addEventListener('install',event=>{event.waitUntil(installSnapshot());});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url),scope=new URL(self.registration.scope);
  if(event.request.mode==='navigate'&&url.origin===scope.origin&&(url.pathname===scope.pathname||url.pathname===scope.pathname+'index.html')){
    // An ordinary refresh gets the newest HTML. Its content-addressed scripts
    // and styles cannot collide with a previous release in either cache layer.
    // Keep the precached HTML untouched: it belongs to a complete offline build.
    event.respondWith((async()=>{
      let response;
      try{response=await fetch(new Request(event.request,{cache:'no-store'}));if(response.ok)return response;}catch{}
      return (await caches.open(CACHE).then(c=>c.match(new URL('./index.html',self.registration.scope))))||response||new Response('Offline',{status:503});
    })());
    return;
  }
  if(!URLs.has(event.request.url))return;
  // Offline assets are addressed by content, so every HTML snapshot loads its
  // matching styles and translations instead of whatever used the same name.
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});
