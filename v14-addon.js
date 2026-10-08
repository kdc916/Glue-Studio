/* maxVFX Glue Studio v1.4.0 — GIF -> full-frame sprite sheet, PNG sequence ZIP and portable .glueproj.
 * 100% local/offline; GIF palette/disposal/deinterlace decoded by gif-decoder.js; ZIP STORE by zip-codec.js.
 */
(async()=>{'use strict';
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
async function ready(){for(let i=0;i<360;i++){if(window.__GlueTest&&window.GlueV13&&window.__GlueV11Test&&window.__GlueV12Test&&window.GlueGIFDecode&&window.GlueZIP)return;await new Promise(resolve=>setTimeout(resolve,16));}throw Error('Glue Studio v1.4 종속 모듈을 불러오지 못했습니다.');}
try{await ready();}catch(err){console.error(err);return;}
const core=window.__GlueTest,state=core.state,oldPivot=window.__GlueV11Test.v11;
const numeric=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
const confIds=['tileW','tileH','columns','gap','padding','fit','trim','power2','alphaMode','keyColor','tolerance','feather','cutoff','bleed','gifW','gifH','fps','gifThreshold','gifDither','gifTransparent','gifBg','v13Align','v13Edge','v13EdgeAmount','v13Matte','v13Timing','previewSpeed','pivotX','pivotY','channelMode','gifImportLayout','gifImportMode'];
let processing=false;
const api={passthrough:false,importFiles,importGIF,exportSequence,saveProject,loadProject};
window.GlueV14=api;
function notify(msg,error=false){core.toast(msg,error);if(error)console.error('[GlueStudio v1.4]',msg);}
function filename(){return(state.frames[0]?.name||'maxVFX_Flipbook').replace(/\.[^.]+$/,'').replace(/(?:[_\s.-]?\d+)+$/,'').replace(/[^a-zA-Z0-9가-힣_-]/g,'_').slice(0,44)||'maxVFX_Flipbook';}
function save(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);}
async function yieldFrame(){return new Promise(resolve=>requestAnimationFrame(resolve));}
function textJson(obj){return JSON.stringify(obj,null,2);}
function makeThumb(bitmap){const canvas=document.createElement('canvas');canvas.width=100;canvas.height=96;const c=canvas.getContext('2d');const k=Math.min(100/bitmap.width,96/bitmap.height);c.drawImage(bitmap,(100-bitmap.width*k)/2,(96-bitmap.height*k)/2,bitmap.width*k,bitmap.height*k);return canvas.toDataURL('image/png');}
function configureFirst(w,h,count,force=false){if(!force&&state.frames.length!==0)return;
 if(force||($('tileW').value==='256'&&$('tileH').value==='256')){$('tileW').value=Math.min(w,4096);$('tileH').value=Math.min(h,4096);}
 if(force||($('gifW').value==='256'&&$('gifH').value==='256')){$('gifW').value=Math.min(w,2048);$('gifH').value=Math.min(h,2048);}
 if($('gifImportLayout').value==='auto')$('columns').value=Math.min(16,Math.ceil(Math.sqrt(count)));
}

function resetForNewGif(){
 core.stopPlay();window.__GlueV12Test?.stop?.();
 if(window.GlueV13?.timing){const t=window.GlueV13.timing;t.playing=false;cancelAnimationFrame(t.raf);}
 core.disposeAll();
 oldPivot.pivots.clear();oldPivot.defaultPivot={x:0.5,y:0.5};oldPivot.editing=false;
 for(const id of ['pivotX','pivotY'])if($(id))$(id).value='0.5';
 if($('pivotEdit'))$('pivotEdit').checked=false;
 $('stage')?.classList.remove('pivot-edit');
 if($('pivotStatus'))$('pivotStatus').textContent='공통 피벗: (0.50, 0.50)';
 for(const [id,v] of Object.entries({gap:'0',padding:'0',fit:'contain',alphaMode:'off',tolerance:'0',feather:'0',cutoff:'0',v13Align:'legacy',v13Edge:'off',v13EdgeAmount:'65',v13Matte:'#000000'}))if($(id))$(id).value=v;
 for(const id of ['trim','power2','bleed'])if($(id))$(id).checked=false;
 for(const id of ['tolerance','feather','cutoff'])if($(id+'Val'))$(id+'Val').textContent=$(id).value;
 if($('v13EdgeValue'))$('v13EdgeValue').textContent='65%';
 if($('v13MatteHolder'))$('v13MatteHolder').hidden=true;
 if($('alphaControls'))$('alphaControls').hidden=false;
 if($('chromaControls'))$('chromaControls').hidden=true;
 window.__GlueV12Test?.setSpeed?.(1);
}

async function importGIF(file,{replace=false}={}){
 if(!/\.gif$/i.test(file.name)&&file.type!=='image/gif')throw Error('GIF 형식만 선택할 수 있습니다.');
 if(file.size>80*1024*1024)throw Error('GIF 파일은 최대 80MB까지 지원합니다.');
 const decoded=window.GlueGIFDecode.decode(await file.arrayBuffer(),{maxFrames:512,maxPixels:32000000});
 if(!replace&&state.frames.length+decoded.frames.length>512)throw Error('프레임 수가 512개를 초과합니다. 새 작업 모드를 사용하거나 이전 프레임을 삭제하세요.');
 const first=replace||state.frames.length===0;
 const staging=[];
 try{
  for(let i=0;i<decoded.frames.length;i++){
   const src=decoded.frames[i];const bitmap=await createImageBitmap(new ImageData(src.rgba,decoded.width,decoded.height));
   staging.push({id:state.nextId++,name:`${file.name.replace(/\.gif$/i,'')}_${String(i+1).padStart(4,'0')}.png`,bitmap,thumb:makeThumb(bitmap),durationMs:src.durationMs});
   if(i%12===0){$('busyDetail').textContent=`GIF 해제 ${i+1} / ${decoded.frames.length}`;await yieldFrame();}
  }
 }catch(err){for(const f of staging)f.bitmap.close?.();throw err;}
 if(replace)resetForNewGif();
 if(first)configureFirst(decoded.width,decoded.height,decoded.frames.length,replace);
 const insertAt=state.frames.length;
 state.frames.push(...staging);state.selected=first?0:insertAt;
 $('v13Timing').checked=true;
 core.renderFrames();core.invalidate();$('scrub').value=state.selected;
 $('scrub').dispatchEvent(new Event('input',{bubbles:true}));
 window.GlueV15?.history?.resetHistory?.();
 if(first)document.querySelector('[data-view="anim"]').click();
 return decoded.frames.length;
}
async function importFiles(input){
 if(processing||state.busy)return;
 const files=Array.from(input||[]).sort((a,b)=>numeric.compare(a.name,b.name));
 if(!files.length)return;
 if(files.length===1&&/\.glueproj$/i.test(files[0].name))return loadProject(files[0]);
 const gifFiles=files.filter(file=>/\.gif$/i.test(file.name)||file.type==='image/gif');
 const replaceMode=gifFiles.length>0&&$('gifImportMode')?.value!=='append';
 if(replaceMode&&state.frames.length&&!confirm('새 GIF로 작업을 시작할까요?\n기존 프레임 및 편집 설정이 교체됩니다. 저장하지 않은 작업은 사라집니다.'))return;
 const ordered=replaceMode?[...gifFiles,...files.filter(file=>!gifFiles.includes(file))]:files;
 processing=true;
 let n=0,failed=[],replacePending=replaceMode;
 try{
  for(const file of ordered){
   if(/\.gif$/i.test(file.name)||file.type==='image/gif'){
    try{core.busy('GIF 전체 프레임 가져오기',file.name);await yieldFrame();const loaded=await importGIF(file,{replace:replacePending});n+=loaded;if(replacePending&&loaded)replacePending=false;}catch(e){failed.push(`${file.name}: ${e.message}`);}finally{core.unbusy();}
   }else if(file.type.startsWith('image/')||/\.(png|jpe?g|webp|bmp)$/i.test(file.name)){
    const before=state.frames.length;api.passthrough=true;
    try{await core.addFiles([file]);n+=state.frames.length-before;}finally{api.passthrough=false;}
   }else failed.push(`${file.name}: 지원되지 않는 입력 형식`);
  }
  if(n)notify(`${replaceMode?'새 GIF 작업 · ':'기존 작업에 추가 · '}${n}개 프레임 로드 완료${failed.length?' · 일부 파일 실패':''}`,!!failed.length);
  if(failed.length){console.warn('GIF import failures:',failed);notify(failed.slice(0,2).join(' / '),true);}
 }finally{processing=false;core.unbusy();}
}
function imageCanvas(bitmap){const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d',{willReadFrequently:true}).drawImage(bitmap,0,0);return canvas;}
async function exportSequence(){if(!state.frames.length||state.busy||processing)return;processing=true;core.busy('PNG 프레임 ZIP 생성','처리된 프레임을 추출하는 중');await yieldFrame();
 try{const conf=core.readConf(),count=state.frames.length;
  if(count*conf.tileW*conf.tileH>32000000)throw Error('시퀀스 ZIP은 전체 3,200만 픽셀 이하로 제한합니다.');
  const manifest=window.GlueV13.metadata();
  const entries=[{name:'atlas.json',data:textJson(manifest)}];
  for(let i=0;i<count;i++){
   const bytes=core.buildFrame(state.frames[i],conf),blob=await GlueExport.encodePNG(bytes,conf.tileW,conf.tileH),png=new Uint8Array(await blob.arrayBuffer());
   entries.push({name:`frames/frame_${String(i).padStart(4,'0')}.png`,data:png});
   if(i%5===0){$('busyDetail').textContent=`PNG ${i+1} / ${count}`;await yieldFrame();}
  }
  const out=GlueZIP.pack(entries);save(out,`${filename()}_PNG_Sequence.zip`);
  notify(`PNG 시퀀스 ${count}장 저장 (${(out.size/1048576).toFixed(1)}MB)`);
 }catch(err){notify('PNG 시퀀스 저장 실패: '+err.message,true);}finally{processing=false;core.unbusy();}
}
function getSettings(){const fields={};for(const id of confIds){const e=$(id);if(e)fields[id]=e.type==='checkbox'?e.checked:e.value;}
 return {fields,pivot:{default:oldPivot.defaultPivot,overrides:state.frames.map(f=>oldPivot.pivots.get(f.id)||null)},selected:state.selected};
}
async function saveProject(){if(!state.frames.length||state.busy||processing)return notify('먼저 이미지를 추가하세요.',true);
 processing=true;core.busy('프로젝트 저장','원본 이미지와 편집 설정을 묶는 중');await yieldFrame();
 try{const settings=getSettings(),entries=[],frames=[];
  let total=0;
  for(let i=0;i<state.frames.length;i++){
   const frame=state.frames[i],name=`frames/${String(i).padStart(4,'0')}.png`,cv=imageCanvas(frame.bitmap),data=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,cv.width,cv.height).data;
   const png=new Uint8Array(await (await GlueExport.encodePNG(data,cv.width,cv.height)).arrayBuffer());total+=png.byteLength;
   if(total>250*1024*1024)throw Error('프로젝트 이미지 데이터가 250MB를 초과했습니다.');
   entries.push({name,data:png});frames.push({path:name,name:frame.name,durationMs:frame.durationMs??null});
   if(i%5===0){$('busyDetail').textContent=`원본 프레임 ${i+1} / ${state.frames.length}`;await yieldFrame();}
  }
  const manifest={schema:'maxvfx.glue-studio.project/1',version:'1.4.0',createdAt:new Date().toISOString(),settings,frames};
  entries.unshift({name:'project.json',data:textJson(manifest)});
  const zip=GlueZIP.pack(entries);save(zip,`${filename()}.glueproj`);
  notify(`프로젝트 저장 완료 · ${state.frames.length}프레임 / ${(zip.size/1048576).toFixed(1)}MB`);
 }catch(err){notify('프로젝트 저장 실패: '+err.message,true);}finally{processing=false;core.unbusy();}
}
function restoreFields(fields){if(!fields||typeof fields!=='object')return;
 for(const id of confIds){if(!(id in fields))continue;const el=$(id);if(!el)continue;
  if(el.type==='checkbox')el.checked=fields[id]===true;
  else if(el.tagName==='SELECT'){const value=String(fields[id]);if([...el.options].some(op=>op.value===value))el.value=value;}
  else if(el.type==='number'||el.type==='range'){const n=Number(fields[id]);if(Number.isFinite(n))el.value=clamp(n,Number(el.min)||0,Number(el.max)||100000);}
  else if(el.type==='color'){if(/^#[\da-fA-F]{6}$/.test(fields[id]))el.value=fields[id];}
 }
 $('toleranceVal').textContent=$('tolerance').value;$('featherVal').textContent=$('feather').value;$('cutoffVal').textContent=$('cutoff').value;
 $('v13EdgeValue').textContent=$('v13EdgeAmount').value+'%';$('v13MatteHolder').hidden=$('v13Edge').value!=='custom';
 $('chromaControls').hidden=$('alphaMode').value!=='chroma';$('alphaControls').hidden=$('alphaMode').value==='opaque';$('gifBgField').hidden=$('gifTransparent').checked;
 window.__GlueV12Test.setSpeed(Number($('previewSpeed').value));
}
async function loadProject(file){if(!file||state.busy||processing)return;if(file.size>300*1024*1024)return notify('프로젝트 파일 크기는 최대 300MB입니다.',true);
 if(state.frames.length&&!confirm('현재 프레임과 설정을 프로젝트로 교체할까요? 저장하지 않은 작업은 사라집니다.'))return;
 processing=true;core.busy('프로젝트 불러오기','파일 구조와 CRC 검증 중');await yieldFrame();const staging=[];
 try{
  const files=GlueZIP.unpack(await file.arrayBuffer(),{maxBytes:270000000,maxEntries:600});
  const json=files.get('project.json');if(!json)throw Error('project.json이 없습니다. .glueproj 파일을 선택하세요.');
  const manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(json));
  if(manifest.schema!=='maxvfx.glue-studio.project/1'||!Array.isArray(manifest.frames)||!manifest.frames.length||manifest.frames.length>512)throw Error('지원하지 않는 프로젝트 버전 또는 프레임 개수입니다.');
  let total=0;const used=new Set();
  for(let i=0;i<manifest.frames.length;i++){
   const f=manifest.frames[i];if(typeof f.path!=='string'||!/^frames\/\d{4}\.png$/.test(f.path)||used.has(f.path)||!files.has(f.path))throw Error('프로젝트 프레임 경로 오류');used.add(f.path);
   const bytes=files.get(f.path);const bmp=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
   if(!bmp.width||!bmp.height||bmp.width>4096||bmp.height>4096||(total+=bmp.width*bmp.height)>32000000){bmp.close?.();throw Error('프로젝트 해상도 제한을 초과했습니다.');}
   staging.push({id:state.nextId++,name:String(f.name||`frame_${i}`).slice(0,220),bitmap:bmp,thumb:makeThumb(bmp),durationMs:Number.isFinite(+f.durationMs)&&f.durationMs!==null?clamp(+f.durationMs,20,60000):undefined});
   if(i%8===0){$('busyDetail').textContent=`프로젝트 프레임 ${i+1} / ${manifest.frames.length}`;await yieldFrame();}
  }
  core.stopPlay();window.__GlueV12Test.stop();if(window.GlueV13?.timing){window.GlueV13.timing.playing=false;cancelAnimationFrame(window.GlueV13.timing.raf);}
  core.disposeAll();state.frames.push(...staging);state.selected=clamp(Number(manifest.settings?.selected)||0,0,state.frames.length-1);
  restoreFields(manifest.settings?.fields||{});
  oldPivot.pivots.clear();const pivot=manifest.settings?.pivot;
  if(pivot?.default&&Number.isFinite(+pivot.default.x)&&Number.isFinite(+pivot.default.y))oldPivot.defaultPivot={x:clamp(+pivot.default.x,0,1),y:clamp(+pivot.default.y,0,1)};
  $('pivotX').value=oldPivot.defaultPivot.x;$('pivotY').value=oldPivot.defaultPivot.y;
  pivot?.overrides?.forEach((p,i)=>{if(state.frames[i]&&p&&Number.isFinite(+p.x)&&Number.isFinite(+p.y))oldPivot.pivots.set(state.frames[i].id,{x:clamp(+p.x,0,1),y:clamp(+p.y,0,1)});});
  core.renderFrames();core.invalidate();$('scrub').dispatchEvent(new Event('input',{bubbles:true}));
  notify(`프로젝트 복원 완료 · ${state.frames.length}프레임`);
 }catch(err){for(const f of staging)if(!state.frames.includes(f))f.bitmap.close?.();notify('프로젝트 불러오기 실패: '+err.message,true);}finally{processing=false;core.unbusy();}
}
function mount(){
 $('fileInput').accept='image/png,image/jpeg,image/webp,image/bmp,image/gif,.bmp,.gif,.glueproj';
 const gifButton=document.createElement('button');gifButton.id='v14GIFImport';gifButton.type='button';gifButton.className='secondary';gifButton.textContent='◩ GIF → 시트';
 $('btnImportSheet').after(gifButton);
 const gifInput=document.createElement('input');gifInput.type='file';gifInput.accept='.gif,image/gif';gifInput.hidden=true;document.body.append(gifInput);
 gifButton.addEventListener('click',()=>gifInput.click());gifInput.addEventListener('change',e=>{importFiles(e.target.files);e.target.value='';});
 const panel=gifButton.closest('.panel');
 const mode=document.createElement('label');mode.className='field';
 mode.innerHTML='<span>GIF 불러오기 방식</span><select id="gifImportMode"><option value="replace">새 작업 시작 · 기존 프레임 교체 (기본)</option><option value="append">기존 프레임 뒤에 이어 붙이기</option></select>';
 panel.append(mode);
 const hint=document.createElement('p');hint.className='small-muted';hint.id='gifImportModeHelp';
 hint.textContent='새 작업은 이전 시퀀스·피벗·알파 보정을 초기화합니다. 필요한 경우 .glueproj로 먼저 저장하세요.';
 panel.append(hint);
 const option=document.createElement('label');option.className='field';option.innerHTML='<span>GIF 그리드 설정</span><select id="gifImportLayout"><option value="auto">프레임 수에 맞게 자동 열 구성</option><option value="keep">기존 열 수 유지</option></select>';
 panel.append(option);
 const note=gifButton.closest('.panel').querySelector('.small-muted');if(note)note.textContent='PNG · JPG · WEBP · BMP · GIF 전체 프레임 / .glueproj 프로젝트 · 드래그 앤 드롭';
 const exportPanel=$('exportPng').closest('.export-panel');
 const newBar=document.createElement('section');newBar.className='v14-panel';newBar.innerHTML='<div><small>WORKFLOW & PORTABLE PROJECT</small><strong>프레임 시퀀스 및 프로젝트 관리</strong></div><div class="v14-actions"><button id="v14Sequence" class="small-btn">↓ PNG 시퀀스 ZIP</button><button id="v14Save" class="small-btn">↓ 프로젝트 저장</button><button id="v14Load" class="small-btn">↑ 프로젝트 불러오기</button></div><p class="small-muted">.glueproj 프로젝트에는 원본 프레임·피벗·알파·재생시간·시트 설정이 포함됩니다. ZIP 시퀀스는 현재 보정 결과가 PNG로 저장됩니다.</p>';
 exportPanel.after(newBar);
 const input=document.createElement('input');input.type='file';input.accept='.glueproj';input.hidden=true;document.body.append(input);
 $('v14Sequence').addEventListener('click',exportSequence);$('v14Save').addEventListener('click',saveProject);$('v14Load').addEventListener('click',()=>input.click());input.addEventListener('change',e=>{loadProject(e.target.files?.[0]).catch(err=>notify(err.message,true));e.target.value='';});
 const style=document.createElement('style');style.textContent='.upload-choices #v14GIFImport{grid-column:1/-1}.v14-panel{background:#17252c;border:1px solid #427269;border-radius:12px;padding:17px;margin-top:10px;display:grid;gap:12px}.v14-panel>div:first-child{display:grid;gap:5px}.v14-panel small{font-size:10px;letter-spacing:1.6px;color:#78ddbf}.v14-actions{display:flex;flex-wrap:wrap;gap:9px}.v14-actions>button{min-height:40px;flex:1;white-space:nowrap}.v14-panel p{margin:0}#v14GIFImport{white-space:nowrap}@media(max-width:560px){.v14-actions{display:grid}.v14-actions>button{width:100%}}';document.head.append(style);
 $('helpDialog').querySelector('ol')?.insertAdjacentHTML('beforeend','<li>GIF를 새로 불러오면 이전 프레임을 교체합니다. 추가하려면 불러오기 방식을 변경하세요. PNG/TGA 시트 저장으로 GIF를 스프라이트 시트로 변환할 수 있습니다.</li><li>프로젝트 파일(.glueproj)을 저장해 다른 PC에서도 같은 편집을 계속하거나, PNG 시퀀스 ZIP으로 프레임을 따로 저장할 수 있습니다.</li>');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();