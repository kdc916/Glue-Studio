/* maxVFX Glue Studio v1.6.0 — opt-in IndexedDB recovery and transferable worker export.
 * All recovery data stays in browser origin storage. Nothing is sent to any server.
 */
(async()=>{'use strict';
const $=id=>document.getElementById(id);
for(let n=0;n<500&&!(window.__GlueTest&&window.GlueV14&&window.GlueV15&&window.GlueV13&&window.__GlueV11Test&&window.GlueZIP&&window.GlueExport);n++)await new Promise(r=>setTimeout(r,20));
if(!(window.__GlueTest&&window.GlueV14&&window.GlueV15&&window.GlueZIP))return console.error('Glue Studio v1.6: required modules missing');
const core=window.__GlueTest, state=core.state, pivot=window.__GlueV11Test.v11;
const DB='maxvfx-glue-recovery-v1', STORE='snapshots', KEY='latest', MAX_FRAMES=80, MAX_PIXELS=12000000, MAX_BYTES=48*1024*1024;
const CFG=['tileW','tileH','columns','gap','padding','fit','trim','power2','alphaMode','keyColor','tolerance','feather','cutoff','bleed','gifW','gifH','fps','gifThreshold','gifDither','gifTransparent','gifBg','v13Align','v13Edge','v13EdgeAmount','v13Matte','v13Timing','previewSpeed','pivotX','pivotY','channelMode','gifImportLayout','gifImportMode'];
let enabled=false, saving=false, dirty=false, timer=0, lastSave=0, lastFingerprint='', activeWorker=null, sequence=0;
function notify(msg,err=false){$('v16Status').textContent=msg; if(err)console.warn('[Glue v1.6]',msg);}
function storageSetting(){try{return localStorage.getItem('maxvfx-glue-autorecover-enabled')==='1'}catch(_){return false}}
function setStorageSetting(v){try{localStorage.setItem('maxvfx-glue-autorecover-enabled',v?'1':'0')}catch(_){}}
function supported(){return typeof indexedDB!=='undefined'&&!!window.GlueZIP;}
function openDb(){return new Promise((resolve,reject)=>{if(!supported())return reject(Error('이 브라우저에서는 IndexedDB를 지원하지 않습니다.'));const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE)};request.onerror=()=>reject(request.error||Error('DB 연결 실패'));request.onsuccess=()=>resolve(request.result);});}
async function dbAction(mode,fn){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let req;try{req=fn(store)}catch(e){reject(e);return}req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('저장소 접근 실패'));tx.onabort=()=>reject(tx.error||Error('트랜잭션 중단'));});}finally{db.close();}}
const readSlot=()=>dbAction('readonly',s=>s.get(KEY));
const writeSlot=x=>dbAction('readwrite',s=>s.put(x,KEY));
const deleteSlot=()=>dbAction('readwrite',s=>s.delete(KEY));
async function pause(){return new Promise(r=>setTimeout(r,0));}
function fingerprint(){const fields=CFG.map(id=>{const el=$(id);return el?(el.type==='checkbox'?el.checked:el.value):''});const overrides=[...pivot.pivots].filter(([id])=>state.frames.some(f=>f.id===id));return JSON.stringify([state.frames.map(f=>[f.id,f.name,f.durationMs||null,f.bitmap.width,f.bitmap.height]),fields,pivot.defaultPivot,overrides]);}
function settings(){return {fields:Object.fromEntries(CFG.filter(id=>$(id)).map(id=>[id,$(id).type==='checkbox'?$(id).checked:$(id).value])),pivot:{default:{...pivot.defaultPivot},overrides:state.frames.map(f=>pivot.pivots.get(f.id)||null)},selected:state.selected};}
async function serialize(){
 const frames=state.frames.slice();if(!frames.length)throw Error('저장할 프레임이 없습니다.');
 if(frames.length>MAX_FRAMES)throw Error(`자동 복구는 ${MAX_FRAMES}프레임 이하에서 사용할 수 있습니다. 프로젝트 저장을 이용해 주세요.`);
 const pixels=frames.reduce((s,f)=>s+f.bitmap.width*f.bitmap.height,0);if(pixels>MAX_PIXELS)throw Error(`원본 이미지가 ${MAX_PIXELS.toLocaleString()}픽셀을 초과합니다. 수동 프로젝트 저장을 이용해 주세요.`);
 const source=frames.map(f=>f.id).join('|'),config=settings();let bytes=0;
 const list=[],metadata=[];
 for(let i=0;i<frames.length;i++){
  if(state.frames.map(f=>f.id).join('|')!==source)throw Error('프레임이 변경되어 자동 저장을 다시 예약했습니다.');
  const f=frames[i],canvas=document.createElement('canvas');canvas.width=f.bitmap.width;canvas.height=f.bitmap.height;
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('캔버스 생성 실패');context.drawImage(f.bitmap,0,0);
  const rgba=context.getImageData(0,0,canvas.width,canvas.height).data;
  const png=await GlueExport.encodePNG(rgba,canvas.width,canvas.height);bytes+=png.size;
  if(bytes>MAX_BYTES)throw Error('자동 복구 저장량 48MiB 제한을 초과했습니다. 수동 프로젝트 저장을 이용해 주세요.');
  const path=`frames/${String(i).padStart(4,'0')}.png`;
  list.push({name:path,data:new Uint8Array(await png.arrayBuffer())});metadata.push({path,name:f.name,durationMs:f.durationMs??null});
  if(i%3===0)await pause();
 }
 const manifest={schema:'maxvfx.glue-studio.project/1',version:'1.6.0',createdAt:new Date().toISOString(),settings:config,frames:metadata};
 list.unshift({name:'project.json',data:JSON.stringify(manifest)});
 return {blob:GlueZIP.pack(list),count:frames.length};
}
async function snapshot(force=false){if(saving||!enabled||!supported()||state.busy||!state.frames.length)return false;
 const fp=fingerprint();if(!force&&!dirty&&fp===lastFingerprint)return false;
 saving=true;notify('브라우저에 복구용 데이터를 저장하고 있습니다…');
 try{const result=await serialize();const nextFp=fingerprint();if(nextFp!==fp){dirty=true;notify('편집이 계속되어 변경 완료 후 다시 저장합니다.');return false;}
  await writeSlot({blob:result.blob,at:Date.now(),count:result.count,bytes:result.blob.size});lastSave=Date.now();lastFingerprint=nextFp;dirty=false;
  notify(`로컬 복구 저장 완료 · ${result.count}프레임 · ${(result.blob.size/1048576).toFixed(1)}MiB · ${new Date(lastSave).toLocaleTimeString()}`);await updateStored();return true;
 }catch(e){dirty=true;notify('자동 복구 저장 보류: '+e.message,true);return false;}finally{saving=false;}}
function markDirty(){if(!enabled)return;dirty=true;clearTimeout(timer);timer=setTimeout(()=>snapshot(),25000);}
function schedule(){markDirty();}
async function updateStored(){try{const slot=await readSlot();$('v16Restore').disabled=!slot;$('v16Delete').disabled=!slot;
 $('v16SavedInfo').textContent=slot?`복구본: ${new Date(slot.at).toLocaleString()} · ${slot.count}프레임 · ${(slot.bytes/1048576).toFixed(1)}MiB`:'저장된 복구본 없음';
 }catch(e){$('v16SavedInfo').textContent='복구 저장소를 사용할 수 없습니다: '+e.message;}}
async function restore(){try{const slot=await readSlot();if(!slot?.blob)return notify('복구본이 없습니다.',true);
 if(!confirm(`저장된 ${slot.count}프레임 작업(${new Date(slot.at).toLocaleString()})을 불러올까요? 현재 작업은 교체됩니다.`))return;
 const previous=enabled;enabled=false;clearTimeout(timer);try{await window.GlueV14.loadProject(new File([slot.blob],'recovery.glueproj',{type:'application/octet-stream'}));}finally{enabled=previous;lastFingerprint='';dirty=true;if(enabled)markDirty();}
 }catch(e){notify('복구 실패: '+e.message,true);}}
async function clear(){if(!confirm('브라우저에 저장된 자동 복구본을 삭제할까요? 자동 복구도 비활성화됩니다.'))return;try{enabled=false;setStorageSetting(false);$('v16Enabled').checked=false;clearTimeout(timer);await deleteSlot();notify('저장된 자동 복구본을 삭제하고 자동 복구를 비활성화했습니다.');await updateStored();}catch(e){notify(e.message,true);}}
async function encodeSheet(format,rgba,w,h){if(!['png','tga'].includes(format))throw Error('지원하지 않는 출력 형식');
 if(!window.GlueV16WorkerCode||typeof Worker==='undefined'||typeof URL.createObjectURL!=='function')return null;
 const id=++sequence;let worker,workerUrl;
 try{
  workerUrl=URL.createObjectURL(new Blob([window.GlueV16WorkerCode],{type:'text/javascript'}));
  worker=new Worker(workerUrl);activeWorker=worker;
  const arr=rgba instanceof Uint8ClampedArray?rgba:new Uint8ClampedArray(rgba);
  const output=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('Worker 출력 시간 초과')),120000);
   const done=(err,value)=>{clearTimeout(timeout);err?reject(err):resolve(value)};
   worker.onmessage=e=>{if(e.data?.id!==id)return; e.data.ok?done(null,e.data):done(Error(e.data?.error||'Worker 인코딩 실패'));};
   worker.onerror=e=>done(Error(e.message||'Worker 초기화 실패'));
   worker.postMessage({id,format,width:w,height:h,rgba:arr.buffer},[arr.buffer]);
  });
  const blob=new Blob([output.buffer],{type:format==='png'?'image/png':'image/x-tga'});
  notify(`백그라운드 ${format.toUpperCase()} 인코딩 완료 · ${(blob.size/1048576).toFixed(1)}MiB`);return blob;
 }catch(e){console.warn('[Glue v1.6] worker export fallback:',e);return null;}
 finally{if(worker)worker.terminate();if(activeWorker===worker)activeWorker=null;if(workerUrl)URL.revokeObjectURL(workerUrl);}
}
// NOTE: worker transfers the atlas buffer. The legacy fallback must regenerate bytes after a failed transfer.
function mount(){
 const el=document.createElement('section');el.className='v16-panel';el.innerHTML=`<div class="v16-title"><div><small>WORKSPACE SAFETY · v1.6</small><h3>작업 자동 복구</h3></div><label class="checkline"><input type="checkbox" id="v16Enabled"> 자동 복구 활성화</label></div><p class="small-muted">기본 OFF · 이미지와 편집 설정을 이 브라우저의 IndexedDB에만 저장합니다. 로그인/서버 전송 없음. 용량 제한 및 브라우저 저장소 정책 적용.</p><div class="v16-controls"><button class="small-btn" id="v16Save">지금 복구본 저장</button><button class="small-btn" id="v16Restore" disabled>저장된 작업 복구</button><button class="small-btn danger" id="v16Delete" disabled>복구본 삭제</button></div><p id="v16SavedInfo" class="small-muted">복구본 확인 중…</p><p id="v16Status" role="status" aria-live="polite" class="small-muted">자동 저장은 변경 후 일정 시간이 지나면 수행됩니다.</p><p class="small-muted">원본 최대 80프레임 / 합계 1,200만 픽셀 / 저장본 48MiB. 큰 프로젝트는 .glueproj로 수동 저장하세요.</p>`;
 ($('v15Check')?.closest('.v15-panel')||$('v14Save')?.closest('.v14-panel')||$('exportPng').closest('.export-panel')).after(el);
 const css=document.createElement('style');css.textContent='.v16-panel{background:#172434;border:1px solid #38597e;border-radius:12px;padding:17px;margin-top:12px;display:grid;gap:10px}.v16-title{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.v16-title small{font-size:10px;letter-spacing:1.5px;color:#8ac6e9}.v16-title h3{font-size:16px;margin:6px 0}.v16-controls{display:flex;gap:8px;flex-wrap:wrap}.v16-controls button{min-height:38px;flex:1}.v16-panel p{margin:0}@media(max-width:560px){.v16-controls{display:grid}.v16-controls button{width:100%}}';document.head.append(css);
 enabled=storageSetting()&&supported();$('v16Enabled').checked=enabled;
 $('v16Enabled').disabled=!supported();
 $('v16Enabled').addEventListener('change',()=>{enabled=$('v16Enabled').checked&&supported();setStorageSetting(enabled);clearTimeout(timer);notify(enabled?'자동 복구 활성화 · 변경 후 25초 동안 편집이 없으면 저장합니다.':'자동 복구 비활성화 · 기존 저장본은 별도 삭제 전까지 유지됩니다.');if(enabled)markDirty();});
 $('v16Save').addEventListener('click',async()=>{if(!enabled){notify('자동 복구를 먼저 활성화해 주세요.',true);return;}if(!state.frames.length){notify('먼저 프레임을 추가하세요.',true);return;}dirty=true;await snapshot(true);});
 $('v16Restore').addEventListener('click',restore);$('v16Delete').addEventListener('click',clear);
 document.addEventListener('input',e=>{if(e.target.closest('.v16-panel'))return;schedule()},true);
 document.addEventListener('change',e=>{if(e.target.closest('.v16-panel'))return;schedule()},true);
 document.addEventListener('click',e=>{if(e.target.closest('.v16-panel'))return;if(e.target.closest('button')||e.target.closest('#preview')||e.target.closest('#frames'))schedule()},true);
 document.addEventListener('drop',()=>setTimeout(schedule,600),true);
 window.addEventListener('pagehide',()=>clearTimeout(timer));
 setInterval(()=>{if(enabled&&!saving&&state.frames.length){const newFp=fingerprint();if(dirty||newFp!==lastFingerprint)snapshot();}},120000);
 if(enabled&&state.frames.length)markDirty();updateStored();
 $('helpDialog').querySelector('ol')?.insertAdjacentHTML('beforeend','<li>v1.6 자동 복구는 선택 활성화 방식이며, 이미지 원본이 브라우저에 저장됩니다. 대용량 프로젝트는 수동 .glueproj 저장을 이용하세요.</li>');
}
window.GlueV16={encodeSheet,snapshot,readSlot,deleteSlot,serialize,fingerprint,dbAction,limits:{MAX_FRAMES,MAX_PIXELS,MAX_BYTES}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();

