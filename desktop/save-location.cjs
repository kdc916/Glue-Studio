'use strict';
const fs=require('node:fs');
const path=require('node:path');
const SETTINGS_FILE='export-location.json';

function safeFileName(raw){
  let name=String(raw||'').split(/[\\/]/).pop().replace(/[<>:"|?*\x00-\x1f]/g,'_').trim().replace(/[. ]+$/g,'');
  if(!name)name='GlueStudio_Output.png';
  if(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name))name='_'+name;
  return name;
}
function usableDirectory(directory){
  if(typeof directory!=='string'||!directory.trim())return null;
  try{
    const value=path.resolve(directory);
    if(!fs.statSync(value).isDirectory())return null;
    fs.accessSync(value,fs.constants.W_OK);
    return value;
  }catch{return null;}
}
function pickAvailablePath(directory,fileName,reserved=new Set()){
  const folder=usableDirectory(directory);
  if(!folder)throw Error('저장 폴더에 접근할 수 없습니다.');
  const name=safeFileName(fileName),ext=path.extname(name),base=name.slice(0,name.length-ext.length)||'GlueStudio_Output';
  for(let i=0;i<10000;i++){
    const target=path.join(folder,i?`${base} (${i})${ext}`:name);
    if(!reserved.has(target)&&!fs.existsSync(target))return target;
  }
  throw Error('저장 파일명을 결정할 수 없습니다.');
}
function readSavedDirectory(userDataPath){
  try{
    const data=JSON.parse(fs.readFileSync(path.join(userDataPath,SETTINGS_FILE),'utf8'));
    return usableDirectory(data.lastExportDirectory);
  }catch{return null;}
}
function saveDirectory(userDataPath,directory){
  const folder=usableDirectory(directory);
  if(!folder)throw Error('저장 폴더가 존재하지 않거나 쓰기 권한이 없습니다.');
  fs.mkdirSync(userDataPath,{recursive:true});
  const target=path.join(userDataPath,SETTINGS_FILE),temp=target+'.tmp';
  fs.writeFileSync(temp,JSON.stringify({lastExportDirectory:folder},null,2),'utf8');
  fs.renameSync(temp,target);
  return folder;
}
module.exports={safeFileName,usableDirectory,pickAvailablePath,readSavedDirectory,saveDirectory};
