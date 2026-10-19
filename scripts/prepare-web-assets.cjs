'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const root=path.join(__dirname,'../dist');
const sources=['i18n.js','install.js','core.js','battle-ui.js','timeline-ui.js','app.js','styles.css','supabase.js','roomconfig.js','rooms.js'];
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const hash=text=>createHash('sha256').update(text).digest('hex').slice(0,16);

function prepareAssets({check=false}={}){
  let html=read('index.html');
  const outputs=new Map(),assets=[];
  for(const source of sources){
    const content=read(source),ext=path.extname(source),base=path.basename(source,ext);
    const file=`assets/${base}-${hash(content)}${ext}`;
    assets.push('./'+file);outputs.set(file,content);
    const pattern=new RegExp(`((?:src|href)=")(?:(?:assets/)?${base}(?:-[a-f0-9]{16})?\\${ext})(")`,'g');
    html=html.replace(pattern,(_,before,after)=>before+file+after);
    if(!html.includes(`"${file}"`))throw new Error(`Missing HTML reference for ${source}`);
  }
  const version=hash(html);
  const precache=['./','./index.html',...assets,'./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./manifest.webmanifest','./manifest.en.webmanifest'];
  const sw=read('sw.js').replace(/^const CACHE=.*;$/m,`const CACHE=PREFIX+'web-${version}';`)
    .replace(/^const ASSETS=.*;$/m,`const ASSETS=[${precache.map(p=>`'${p}'`).join(',')}];`);
  outputs.set('index.html',html);outputs.set('sw.js',sw);
  if(!check)fs.mkdirSync(path.join(root,'assets'),{recursive:true});
  for(const [file,content] of outputs){
    const exists=fs.existsSync(path.join(root,file));
    if(exists&&read(file)===content)continue;
    if(check)throw new Error(`Outdated web assets: run node scripts/prepare-web-assets.cjs (${file})`);
    fs.writeFileSync(path.join(root,file),content);
  }
  // Keep published content-addressed files available for older HTML that may
  // still be loading during a deployment. Never overwrite an old asset URL.
  return {version,assets};
}
if(require.main===module){const result=prepareAssets({check:process.argv.includes('--check')});console.log(`Web assets ready: ${result.version}`);}
module.exports={prepareAssets};
