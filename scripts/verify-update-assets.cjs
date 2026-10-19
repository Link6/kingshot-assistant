'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),yaml=require('js-yaml');
const version=require('../package.json').version;
function verify(dir,{required=[]}={}){
  const names=fs.readdirSync(dir),manifests=names.filter(n=>/^latest(?:-[\w-]+)?\.yml$/.test(n));
  for(const name of required)if(!manifests.includes(name))throw new Error('Missing update manifest: '+name);
  for(const name of manifests){
    const info=yaml.load(fs.readFileSync(path.join(dir,name),'utf8'));
    if(info.version!==version||!Array.isArray(info.files)||!info.files.length)throw new Error('Invalid update manifest: '+name);
    for(const file of info.files){
      const target=decodeURIComponent(file.url);
      if(path.basename(target)!==target||/[\\/]/.test(target))throw new Error('Invalid update artifact path');
      const bytes=fs.readFileSync(path.join(dir,target));
      if(crypto.createHash('sha512').update(bytes).digest('base64')!==file.sha512||bytes.length!==file.size)throw new Error('Update artifact checksum/size mismatch: '+target);
      if(target.endsWith('.exe')&&(!target.includes('-Setup-')||!fs.existsSync(path.join(dir,target+'.blockmap'))))throw new Error('NSIS update installer/blockmap missing');
    }
    console.log('Verified update manifest and SHA-512: '+name);
  }
  if(names.some(n=>n.endsWith('.exe'))&&!manifests.includes('latest.yml'))throw new Error('Windows update manifest missing');
  if(names.some(n=>n.endsWith('.AppImage'))&&!manifests.includes('latest-linux.yml'))throw new Error('Linux update manifest missing');
  return manifests;
}
if(require.main===module)verify(process.argv[2]||'desktop-release');
module.exports={verify};
