'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {extractFile}=require('@electron/asar');
const expected=fs.readFileSync('LICENSE');
const archives=[];
function visit(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);
    if(entry.isDirectory())visit(file);
    else if(entry.isFile()&&entry.name==='app.asar')archives.push(file);
  }
}
visit('desktop-release');
if(!archives.length)throw new Error('No packaged app.asar found');
for(const archive of archives){
  if(!extractFile(archive,'LICENSE').equals(expected))throw new Error('Packaged license differs: '+archive);
  if(JSON.parse(extractFile(archive,'package.json').toString('utf8')).license!=='MIT')throw new Error('Packaged MIT metadata missing: '+archive);
  if(!extractFile(archive,path.join('electron','updates.cjs')).equals(fs.readFileSync('electron/updates.cjs')))throw new Error('Packaged updater differs from source');
  for(const file of ['rooms-auth.cjs','preload.cjs'])if(!extractFile(archive,path.join('electron',file)).equals(fs.readFileSync(path.join('electron',file))))throw new Error('Packaged room authentication differs from source');
  if(JSON.parse(extractFile(archive,path.join('node_modules','electron-updater','package.json')).toString('utf8')).version!==require('../package.json').dependencies['electron-updater'])throw new Error('Packaged updater dependency/version missing');
  const feed=require('js-yaml').load(fs.readFileSync(path.join(path.dirname(archive),'app-update.yml'),'utf8'));
  if(feed.provider!=='github'||feed.owner!=='Link6'||feed.repo!=='kingshot-assistant')throw new Error('Unexpected packaged update feed');
  console.log('MIT license verified: '+archive);
}
