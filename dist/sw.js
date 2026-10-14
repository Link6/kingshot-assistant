// Each project on the same github.io origin owns only its own cache namespace.
const PREFIX=`kingshot:${self.registration.scope}:`;
const CACHE=PREFIX+'v0.2.7-desktop-icons';
const ASSETS=['./','./index.html','./styles.css','./i18n.js','./install.js','./core.js','./app.js','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./manifest.webmanifest','./manifest.en.webmanifest'];
const URLs=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!URLs.has(event.request.url))return;
  // A complete version is installed atomically; never mix old/new application modules.
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});
