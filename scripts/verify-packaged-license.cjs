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
  console.log('MIT license verified: '+archive);
}
