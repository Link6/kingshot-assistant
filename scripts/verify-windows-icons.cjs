'use strict';
// Compare the actual PE icon resources with the project's ICO, without running the EXEs.
const fs=require('node:fs');
const path=require('node:path');
const ico=fs.readFileSync('electron/icons/icon.ico');
const expected=Array.from({length:ico.readUInt16LE(4)},(_,i)=>{
  const offset=6+i*16,size=ico.readUInt32LE(offset+8),start=ico.readUInt32LE(offset+12);
  return ico.subarray(start,start+size);
});
function iconGroups(buffer){
  const pe=buffer.readUInt32LE(0x3c),optional=pe+24;
  if(buffer.toString('ascii',pe,pe+4)!=='PE\0\0')throw new Error('Invalid PE executable');
  const directory=optional+(buffer.readUInt16LE(optional)===0x20b?112:96);
  const sections=optional+buffer.readUInt16LE(pe+20);
  function fileOffset(rva){
    for(let i=0;i<buffer.readUInt16LE(pe+6);i++){
      const s=sections+i*40,va=buffer.readUInt32LE(s+12),size=Math.max(buffer.readUInt32LE(s+8),buffer.readUInt32LE(s+16));
      if(rva>=va&&rva<va+size)return buffer.readUInt32LE(s+20)+rva-va;
    }
    throw new Error('Resource RVA outside PE sections');
  }
  const root=fileOffset(buffer.readUInt32LE(directory+16)),resources=[];
  function visit(offset,ids){
    const count=buffer.readUInt16LE(offset+12)+buffer.readUInt16LE(offset+14);
    for(let i=0;i<count;i++){
      const entry=offset+16+i*8,id=buffer.readUInt32LE(entry),target=buffer.readUInt32LE(entry+4),next=root+(target&0x7fffffff);
      if(target&0x80000000)visit(next,[...ids,id]);
      else{
        const start=fileOffset(buffer.readUInt32LE(next)),size=buffer.readUInt32LE(next+4);
        resources.push({ids:[...ids,id],data:buffer.subarray(start,start+size)});
      }
    }
  }
  visit(root,[]);
  return resources.filter(r=>r.ids[0]===14).map(group=>{
    const count=group.data.readUInt16LE(4);
    return Array.from({length:count},(_,i)=>{
      const id=group.data.readUInt16LE(6+i*14+12);
      const icon=resources.find(r=>r.ids[0]===3&&r.ids[1]===id&&r.ids[2]===group.ids[2]);
      if(!icon)throw new Error('Missing icon image resource');
      return icon.data;
    });
  });
}
const files=['desktop-release/win-unpacked/Kingshot Assistant.exe',
  ...fs.readdirSync('desktop-release').filter(f=>f.endsWith('.exe')).map(f=>path.join('desktop-release',f))];
if(files.length!==3)throw new Error('Expected installed app, installer and portable EXE');
for(const file of files){
  const groups=iconGroups(fs.readFileSync(file));
  if(!groups.some(group=>group.length===expected.length&&expected.every(data=>group.some(actual=>actual.equals(data)))))
    throw new Error('Project icon missing or incomplete: '+file);
  console.log('Project icon verified: '+file);
}
