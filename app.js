/* maxVFX Glue Studio v1.0.0 — 100% offline browser editor */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const state={frames:[],selected:0,view:'sheet',cacheVersion:1,cache:new Map(),playing:false,raf:0,lastTick:0,zoom:1,panX:0,panY:0,autoFit:true,eyeDrop:false,sourceWidth:0,sourceHeight:0,nextId:1,sliceFile:null,renderPending:false,busy:false};
const numeric=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
const configIds=['tileW','tileH','columns','gap','padding','fit','trim','power2','alphaMode','keyColor','tolerance','feather','cutoff','bleed','gifW','gifH','fps','gifThreshold','gifDither','gifTransparent','gifBg'];
const getNum=(id,min,max)=>Math.max(min,Math.min(max,Number($(id).value)||min));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const sleep=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
let toastTimer;
let alphaModeLast='off';
let alphaProfiles={off:[0,0],black:[0,0],white:[0,0],chroma:[25,30],opaque:[0,0]};
function switchAlphaProfile(){const next=$('alphaMode').value;alphaProfiles[alphaModeLast]=[Number($('tolerance').value),Number($('feather').value)];const values=alphaProfiles[next]||[0,0];$('tolerance').value=values[0];$('feather').value=values[1];$('toleranceVal').textContent=values[0];$('featherVal').textContent=values[1];alphaModeLast=next;}
function toast(message,error=false){let t=$('toast');t.textContent=message;t.className='visible'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.className='',4200);}
function busy(title,detail=''){state.busy=true;$('busyTitle').textContent=title;$('busyDetail').textContent=detail;$('busy').hidden=false;}
function unbusy(){state.busy=false;$('busy').hidden=true;}
function outputFile(blob,name){const url=URL.createObjectURL(blob);let a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
function fileBase(){let name=state.frames[0]?.name||'maxVFX_Flipbook';return name.replace(/\.[^.]+$/,'').replace(/(?:[_\s.-]?\d+)+$/,'').replace(/[^a-zA-Z0-9가-힣_-]/g,'_').slice(0,45)||'maxVFX_Flipbook';}
function readConf(){return {tileW:getNum('tileW',1,4096),tileH:getNum('tileH',1,4096),columns:getNum('columns',1,128),gap:getNum('gap',0,256),padding:getNum('padding',0,256),fit:$('fit').value,trim:$('trim').checked,power2:$('power2').checked,alphaMode:$('alphaMode').value,keyColor:$('keyColor').value,tolerance:getNum('tolerance',0,150),feather:getNum('feather',0,150),cutoff:getNum('cutoff',0,100),bleed:$('bleed').checked,gifW:getNum('gifW',1,2048),gifH:getNum('gifH',1,2048),fps:getNum('fps',1,50),gifThreshold:getNum('gifThreshold',0,255),gifTransparent:$('gifTransparent').checked,gifDither:$('gifDither').checked,gifBg:$('gifBg').value};}
function nextP2(n){let p=1;while(p<n)p*=2;return p;}
function dimensions(c=readConf()){const cols=Math.min(c.columns,Math.max(1,state.frames.length)),rows=Math.ceil(state.frames.length/cols);let w=c.padding*2+cols*c.tileW+Math.max(0,cols-1)*c.gap,h=c.padding*2+rows*c.tileH+Math.max(0,rows-1)*c.gap;return {cols,rows,width:c.power2?nextP2(w):w,height:c.power2?nextP2(h):h};}
function makeCanvas(w,h){let can=document.createElement('canvas');can.width=w;can.height=h;return can;}
function hexRGB(hex){return [1,3,5].map(x=>parseInt(hex.slice(x,x+2),16));}
function alphaProcess(data,c){let [kr,kg,kb]=hexRGB(c.keyColor),cut=Math.round(c.cutoff*2.55);let mode=c.alphaMode;
 for(let i=0;i<data.length;i+=4){let r=data[i],g=data[i+1],b=data[i+2],origA=data[i+3];if(mode==='opaque'){data[i+3]=255;continue;}
 if(origA===0){data[i+3]=0;continue;}
 if(mode==='black'||mode==='white'){
   let strength=mode==='black'?Math.max(r,g,b):255-Math.min(r,g,b);
   let a=clamp((strength-c.tolerance)/Math.max(1,255-c.tolerance),0,1);
   if(c.feather>0){let softness=clamp((strength-c.tolerance)/Math.max(1,c.feather),0,1);a=a*softness;}
   if(a>0){let inherent=Math.max(1/255,strength/255);
     if(mode==='black'){data[i]=clamp(Math.round(r/inherent),0,255);data[i+1]=clamp(Math.round(g/inherent),0,255);data[i+2]=clamp(Math.round(b/inherent),0,255);}
     else{data[i]=clamp(Math.round((r-255*(1-inherent))/inherent),0,255);data[i+1]=clamp(Math.round((g-255*(1-inherent))/inherent),0,255);data[i+2]=clamp(Math.round((b-255*(1-inherent))/inherent),0,255);}
   }
   data[i+3]=Math.round(origA*a);
 }else if(mode==='chroma'){
   const dist=Math.sqrt((r-kr)**2+(g-kg)**2+(b-kb)**2);
   const a=c.feather===0?(dist>c.tolerance?1:0):clamp((dist-c.tolerance)/c.feather,0,1);
   if(a>0.015&&a<1){data[i]=clamp(Math.round((r-kr*(1-a))/a),0,255);data[i+1]=clamp(Math.round((g-kg*(1-a))/a),0,255);data[i+2]=clamp(Math.round((b-kb*(1-a))/a),0,255);}
   data[i+3]=Math.round(origA*a);
 }
 if(data[i+3]<=cut)data[i+3]=0;
 }
 return data;
}
// Extend nearest visible RGB into alpha-zero texels (the file encoders preserve these RGB bytes).
function applyBleed(data,w,h,radius=6){let n=w*h,queue=new Int32Array(n),src=new Int32Array(n),dist=new Uint8Array(n),head=0,tail=0;
 for(let p=0;p<n;p++){if(data[p*4+3]>0){queue[tail++]=p;src[p]=p;dist[p]=0;}else{src[p]=-1;dist[p]=255;}}
 while(head<tail){let p=queue[head++];if(dist[p]>=radius)continue;let x=p%w,y=(p/w)|0;
   const touch=q=>{if(dist[q]!==255)return;dist[q]=dist[p]+1;src[q]=src[p];queue[tail++]=q;};
   if(x>0)touch(p-1);if(x<w-1)touch(p+1);if(y>0)touch(p-w);if(y<h-1)touch(p+w);
 }
 for(let p=0;p<n;p++){if(data[p*4+3]!==0||src[p]<0)continue;const q=src[p]*4,i=p*4;data[i]=data[q];data[i+1]=data[q+1];data[i+2]=data[q+2];}
}
function calcTrim(frame,c){const k=`${c.alphaMode}|${c.keyColor}|${c.tolerance}|${c.feather}|${c.cutoff}`;
 if(frame.trim?.key===k)return frame.trim.rect;
 const w=frame.bitmap.width,h=frame.bitmap.height;if(w*h>20000000)return {x:0,y:0,w,h};
 const temp=makeCanvas(w,h),ctx=temp.getContext('2d',{willReadFrequently:true});ctx.drawImage(frame.bitmap,0,0);let bytes=ctx.getImageData(0,0,w,h).data;alphaProcess(bytes,c);
 let minX=w,minY=h,maxX=-1,maxY=-1;
 for(let y=0,p=3;y<h;y++)for(let x=0;x<w;x++,p+=4)if(bytes[p]>0){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 const rect=maxX<0?{x:0,y:0,w,h}:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1};frame.trim={key:k,rect};return rect;
}
function buildFrame(frame,c){const w=c.tileW,h=c.tileH,key=state.cacheVersion;let old=state.cache.get(frame.id);if(old?.version===key&&old.w===w&&old.h===h){state.cache.delete(frame.id);state.cache.set(frame.id,old);return old.data;}
 const canvas=makeCanvas(w,h),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 let source=c.trim?calcTrim(frame,c):{x:0,y:0,w:frame.bitmap.width,h:frame.bitmap.height};
 if(window.GlueV13?.sourceRect)source=window.GlueV13.sourceRect(frame,c,source);
 let dx=0,dy=0,dw=w,dh=h;
 if(c.fit==='contain'||c.fit==='cover'){
   let factor=c.fit==='contain'?Math.min(w/source.w,h/source.h):Math.max(w/source.w,h/source.h);
   dw=source.w*factor;dh=source.h*factor;dx=(w-dw)/2;dy=(h-dh)/2;
 }
 ctx.drawImage(frame.bitmap,source.x,source.y,source.w,source.h,dx,dy,dw,dh);
 let rgba=ctx.getImageData(0,0,w,h).data;alphaProcess(rgba,c);
 if(window.GlueV13?.process)rgba=window.GlueV13.process(rgba,w,h,c,frame);
 if(c.bleed)applyBleed(rgba,w,h);
 const cacheLimit=96*1048576;if(rgba.byteLength<=cacheLimit){state.cache.delete(frame.id);state.cache.set(frame.id,{version:key,w,h,data:rgba});let usage=0;for(const value of state.cache.values())usage+=value.data.byteLength;while(usage>cacheLimit&&state.cache.size){const oldest=state.cache.keys().next().value;usage-=state.cache.get(oldest).data.byteLength;state.cache.delete(oldest);}}return rgba;
}
function sheetRaw(c=readConf()){const d=dimensions(c);if(d.width>8192||d.height>8192||d.width*d.height>45000000)throw Error(`시트 해상도 ${d.width}×${d.height}가 제한을 초과했습니다. (최대 변 8192px, 총 4500만 픽셀)`);
 let atlas=new Uint8ClampedArray(d.width*d.height*4);
 for(let index=0;index<state.frames.length;index++){
   let frame=buildFrame(state.frames[index],c),col=index%d.cols,row=Math.floor(index/d.cols),px=c.padding+col*(c.tileW+c.gap),py=c.padding+row*(c.tileH+c.gap);
   for(let y=0;y<c.tileH;y++){const offset=((py+y)*d.width+px)*4;atlas.set(frame.subarray(y*c.tileW*4,(y+1)*c.tileW*4),offset);}
 }
 return {bytes:atlas,...d};
}
function canvasWithRGBA(data,w,h){let c=makeCanvas(w,h);c.getContext('2d').putImageData(new ImageData(data,w,h),0,0);return c;}
function showPixels(data,w,h){const cvs=$('preview');cvs.width=w;cvs.height=h;cvs.getContext('2d').putImageData(new ImageData(data,w,h),0,0);}
function checkNotEmpty(){if(!state.frames.length){toast('먼저 이미지 시퀀스를 추가해 주세요.',true);return false;}return true;}
function updateStats(){let total=state.frames.length,c=readConf();$('countStat').textContent=total;$('frameCount').textContent=total;
 let first=state.frames[0];$('sourceStat').textContent=first?`${first.bitmap.width} × ${first.bitmap.height}`:'–';
 let d=dimensions(c);$('sheetDimensions').textContent=total?`SHEET ${d.width} × ${d.height} · ${d.cols} COL / ${d.rows} ROW`:'–';
 $('exportInfo').textContent=total?`${total} frames  ·  ${c.tileW}×${c.tileH} per frame  ·  ${d.width}×${d.height} sheet  ·  GIF ${c.gifW}×${c.gifH} / ${c.fps} FPS`:'이미지를 추가하면 출력 정보가 표시됩니다.';
 $('scrub').max=Math.max(0,total-1);$('scrub').value=Math.min(state.selected,Math.max(0,total-1));$('playTime').textContent=`FRAME ${total?state.selected+1:0} / ${total}`;
 for(let id of ['exportPng','exportTga','exportGif'])$(id).disabled=!total;
}
function renderGrid(d,c){const overlay=$('gridOverlay');overlay.replaceChildren();const active=state.view==='sheet'&&$('showGrid').checked&&state.frames.length;
 overlay.classList.toggle('hidden',!active);if(!active)return;
 for(let i=0;i<state.frames.length&&i<512;i++){const grid=document.createElement('div');grid.className='cell-line';grid.style.cssText=`left:${c.padding+(i%d.cols)*(c.tileW+c.gap)}px;top:${c.padding+Math.floor(i/d.cols)*(c.tileH+c.gap)}px;width:${c.tileW}px;height:${c.tileH}px;`;overlay.append(grid);}
}
function fitZoom(){const stage=$('stage'),inner=$('stage-inner');let w=$('preview').width||1,h=$('preview').height||1;state.zoom=clamp(Math.min((stage.clientWidth-36)/w,(stage.clientHeight-36)/h,1),.025,4);state.panX=0;state.panY=0;state.autoFit=true;applyZoom();}
function applyZoom(){let inner=$('stage-inner');inner.style.transform=`translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;$('zoomLabel').textContent=Math.round(state.zoom*100)+'%';}
function redraw(){if(state.busy)return;const c=readConf();$('stage').className='stage bg-'+$('previewBg').value;$('empty').hidden=state.frames.length>0;
 if(!state.frames.length){$('gridOverlay').replaceChildren();updateStats();return;}
 try{
   let view=state.view,d=dimensions(c);
   if(view==='sheet'){const raw=sheetRaw(c);showPixels(raw.bytes,raw.width,raw.height);renderGrid(d,c);}
   else if(view==='source'){
      const fr=state.frames[state.selected]||state.frames[0];let source=makeCanvas(fr.bitmap.width,fr.bitmap.height);source.getContext('2d').drawImage(fr.bitmap,0,0);let ctx=$('preview').getContext('2d');$('preview').width=source.width;$('preview').height=source.height;ctx.drawImage(source,0,0);renderGrid(d,c);
   }else{
      const bytes=buildFrame(state.frames[state.selected],c);
      if(view==='alpha'){let alpha=new Uint8ClampedArray(bytes.length);for(let i=0;i<bytes.length;i+=4){alpha[i]=alpha[i+1]=alpha[i+2]=bytes[i+3];alpha[i+3]=255;}showPixels(alpha,c.tileW,c.tileH);}
      else showPixels(bytes,c.tileW,c.tileH);
      renderGrid(d,c);
   }
   if(state.autoFit)fitZoom();else applyZoom();
 }catch(e){console.error(e);toast(e.message||'렌더링에 실패했습니다.',true);}
 updateStats();
}
function scheduleRender(){if(state.renderPending)return;state.renderPending=true;setTimeout(()=>{state.renderPending=false;redraw();},80);}
function invalidate(){state.cache.clear();state.cacheVersion++;scheduleRender();}
function renderFrames(){const list=$('frames');list.replaceChildren();if(!state.frames.length){list.innerHTML='<div class="frames-placeholder">아직 추가한 이미지가 없습니다.</div>';return;}
 state.frames.forEach((frame,index)=>{const box=document.createElement('div');box.className='frame'+(index===state.selected?' active':'');box.draggable=true;box.dataset.index=index;box.innerHTML=`<div class="thumb"><img draggable="false" alt="프레임 썸네일"></div><span class="frame-index">${String(index+1).padStart(2,'0')}</span><button class="remove" title="프레임 제거" aria-label="프레임 제거">×</button><b title=""></b>`;
 box.querySelector('img').src=frame.thumb;box.querySelector('b').textContent=frame.name;box.querySelector('b').title=frame.name;
 box.addEventListener('click',e=>{if(e.target.closest('.remove')){frame.bitmap.close?.();state.frames.splice(index,1);state.selected=clamp(state.selected,0,Math.max(0,state.frames.length-1));invalidate();renderFrames();return;}state.selected=index;redraw();renderFrames();});
 box.addEventListener('dragstart',e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(index));});
 box.addEventListener('dragover',e=>{e.preventDefault();box.classList.add('dragtarget');});box.addEventListener('dragleave',()=>box.classList.remove('dragtarget'));
 box.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();box.classList.remove('dragtarget');let from=Number(e.dataTransfer.getData('text/plain'));if(!Number.isInteger(from)||from<0||from>=state.frames.length||from===index)return;const moved=state.frames.splice(from,1)[0];state.frames.splice(index,0,moved);state.selected=index;invalidate();renderFrames();});
 list.append(box);});
}
async function loadFile(file){const bitmap=await createImageBitmap(file);if(bitmap.width>10000||bitmap.height>10000){bitmap.close();throw Error('입력 이미지가 10,000px을 초과합니다.');}
 let thumb=makeCanvas(100,96),ctx=thumb.getContext('2d');let s=Math.min(100/bitmap.width,96/bitmap.height);ctx.drawImage(bitmap,(100-bitmap.width*s)/2,(96-bitmap.height*s)/2,bitmap.width*s,bitmap.height*s);
 return{id:state.nextId++,name:file.name,bitmap,thumb:thumb.toDataURL('image/png')};}
async function addFiles(files, options={}){
 if(window.GlueV14?.importFiles&&!window.GlueV14.passthrough)return window.GlueV14.importFiles(files);
 const images=Array.from(files||[]).filter(f=>f.type.startsWith('image/')||/\.(png|jpe?g|webp|bmp)$/i.test(f.name));
 if(!images.length){toast('지원하는 이미지 파일이 없습니다.',true);return {count:0,failed:['지원하는 이미지 없음']};}
 const replace=options.replace===undefined?$('importMode')?.value!=='append':Boolean(options.replace);
 if(replace&&state.frames.length&&!options.skipConfirm&&!confirm('새 시퀀스로 작업을 시작할까요?\n기존 프레임과 편집 설정이 교체됩니다.'))return {count:0,cancelled:true};
 if((replace?0:state.frames.length)+images.length>512){toast('최대 512프레임까지 지원합니다.',true);return {count:0,failed:['512프레임 초과']};}
 if(state.busy)return {count:0,busy:true};
 busy('이미지 가져오는 중',images.length+'개 이미지 준비');await sleep();
 const success=[],failure=[];
 try{
  for(const file of images.sort((a,b)=>numeric.compare(a.name,b.name))){try{success.push(await loadFile(file));}catch(e){failure.push(file.name+': '+e.message);}}
  if(success.length){
   if(replace){if(window.GlueV14?.resetWorkspace)window.GlueV14.resetWorkspace();else{stopPlay();disposeAll();}}
   const wasEmpty=state.frames.length===0;state.frames.push(...success);
   if(wasEmpty){const w=success[0].bitmap.width,h=success[0].bitmap.height;
    $('tileW').value=Math.min(w,4096);$('tileH').value=Math.min(h,4096);
    $('gifW').value=Math.min(w,2048);$('gifH').value=Math.min(h,2048);
    $('columns').value=Math.min(16,Math.ceil(Math.sqrt(state.frames.length)));
   }
   state.selected=replace?0:Math.max(0,state.frames.length-success.length);
   window.GlueV15?.history?.resetHistory?.();
  }
 }finally{unbusy();invalidate();renderFrames();}
 if(success.length)toast((replace?'새 작업 · ':'기존 작업에 추가 · ')+success.length+'프레임 불러오기 완료'+(failure.length?' / 일부 실패':''),!!failure.length);
 else toast('파일을 불러오지 못했습니다. '+(failure[0]||''),true);
 if(failure.length)console.warn('[Glue Studio] 파일 로딩 실패',failure);
 return {count:success.length,failed:failure};
}
async function sliceSheet(file){if(!file)return;const cols=getNum('sliceCols',1,128),rows=getNum('sliceRows',1,128);if(cols*rows>512){toast('시트 분할은 최대 512프레임입니다.',true);return;}
 busy('시트 분할 중','이미지 영역을 프레임으로 변환합니다.');await sleep();let bitmap;let pieces=[];
 try{
  bitmap=await createImageBitmap(file);
  if(bitmap.width%cols!==0||bitmap.height%rows!==0)throw Error('시트 크기가 지정한 열·행으로 나누어 떨어지지 않습니다.');
  const w=bitmap.width/cols,h=bitmap.height/rows;
  for(let n=0;n<cols*rows;n++){let x=n%cols,y=Math.floor(n/cols);let crop=await createImageBitmap(bitmap,x*w,y*h,w,h),can=makeCanvas(100,96),cx=can.getContext('2d');let s=Math.min(100/w,96/h);cx.drawImage(crop,(100-w*s)/2,(96-h*s)/2,w*s,h*s);
    pieces.push({id:state.nextId++,name:`${file.name.replace(/\.[^.]*$/,'')}_${String(n+1).padStart(3,'0')}.png`,bitmap:crop,thumb:can.toDataURL('image/png')});
    if(n%32===0)await sleep();
  }
  if(!$('sliceAppend').checked){disposeAll();}
  if(state.frames.length+pieces.length>512)throw Error('전체 프레임이 512개를 초과합니다.');
  state.frames.push(...pieces);pieces=[];state.selected=0;$('tileW').value=w;$('tileH').value=h;
  if($('gifW').value==='256'&&$('gifH').value==='256'){$('gifW').value=Math.min(2048,w);$('gifH').value=Math.min(2048,h);}
  invalidate();renderFrames();toast(`${cols}×${rows}, 총 ${cols*rows}프레임으로 분할했습니다.`);
 }catch(e){pieces.forEach(p=>p.bitmap.close?.());toast(e.message,true);}finally{bitmap?.close?.();unbusy();redraw();}
}
function disposeAll(){for(const f of state.frames)f.bitmap.close?.();state.frames=[];state.selected=0;state.cache.clear();}
function setView(view){state.view=view;document.querySelectorAll('.tab').forEach(e=>e.classList.toggle('active',e.dataset.view===view));redraw();}
function setSelected(idx){if(!state.frames.length)return;state.selected=(idx+state.frames.length)%state.frames.length;$('scrub').value=state.selected;if(state.view!=='sheet')redraw();else updateStats();document.querySelectorAll('.frame').forEach((n,i)=>n.classList.toggle('active',i===state.selected));}
function stopPlay(){state.playing=false;cancelAnimationFrame(state.raf);$('btnPlay').textContent='▶';}
function togglePlay(){if(!checkNotEmpty())return;if(state.playing){stopPlay();return;}state.playing=true;$('btnPlay').textContent='Ⅱ';if(state.view==='sheet')setView('anim');state.lastTick=performance.now();const step=(t)=>{if(!state.playing)return;const interval=1000/getNum('fps',1,50);if(t-state.lastTick>=interval){let advance=Math.floor((t-state.lastTick)/interval);state.lastTick+=advance*interval;setSelected(state.selected+advance);}state.raf=requestAnimationFrame(step);};state.raf=requestAnimationFrame(step);}
function updateAlphaUI(){let mode=$('alphaMode').value;$('chromaControls').hidden=mode!=='chroma';$('alphaControls').hidden=mode==='opaque';const map={off:'기존 PNG 알파를 유지합니다. 미세 알파 정리 및 RGB 확장은 선택 적용됩니다.',black:'PixEffect 포토샵 채널 방식: Max(R,G,B) → Alpha, RGB 역보정. 화염·글로우에 권장.',white:'밝은 흰색 배경을 알파로 제거하고 색상 테두리를 역보정합니다.',chroma:'지정한 색상과의 거리를 기반으로 제거합니다. 이미지에서 직접 색을 선택할 수 있습니다.',opaque:'기존 알파를 모두 255로 설정하여 완전히 불투명한 이미지로 만듭니다.'};$('alphaExplain').textContent=map[mode];$('gifBgField').hidden=$('gifTransparent').checked;}
async function runExport(type){if(!checkNotEmpty()||state.busy)return;stopPlay();const c=readConf();busy(`${type.toUpperCase()} 익스포트`, '출력 이미지를 생성하고 있습니다.');await sleep();
 try{
   let blob,name;let base=fileBase();
   if(type==='gif'){
     const count=state.frames.length,px=c.gifW*c.gifH*count;if(px>14000000)throw Error('GIF 작업량이 1,400만 픽셀을 초과합니다. 해상도 또는 프레임 수를 줄여주세요.');
     const arr=[];
     for(let i=0;i<count;i++){
       let rgba=buildFrame(state.frames[i],c),source=canvasWithRGBA(rgba,c.tileW,c.tileH);let dest=makeCanvas(c.gifW,c.gifH),ctx=dest.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,c.gifW,c.gifH);arr.push(ctx.getImageData(0,0,c.gifW,c.gifH).data);
       if(i%8===0){$('busyDetail').textContent=`GIF 프레임 ${i+1} / ${count}`;await sleep();}
     }
     const bg=hexRGB(c.gifBg);const gifOpts={fps:c.fps,delaysMs:window.GlueV13?.frameDelays(state.frames,c.fps),threshold:c.gifThreshold,transparent:c.gifTransparent,dither:c.gifDither,bg};
     const onProgress=(n,total)=>{if(n%4===0||n===total)$('busyDetail').textContent=`GIF 압축 ${n} / ${total}`;};
     blob=window.GlueV17?.encodeGif?await window.GlueV17.encodeGif(arr,c.gifW,c.gifH,gifOpts,onProgress):GlueGIF.encode(arr,c.gifW,c.gifH,gifOpts,onProgress);
     name=`${base}_${c.gifW}x${c.gifH}_${c.fps}fps.gif`;
   }else{
     const raw=sheetRaw(c);$('busyDetail').textContent=`${raw.width} × ${raw.height} · ${state.frames.length}프레임`;await sleep();
     blob=window.GlueV16?.encodeSheet?await window.GlueV16.encodeSheet(type,raw.bytes,raw.width,raw.height):null;if(!blob){const pixels=raw.bytes.byteLength===0?sheetRaw(c):raw;blob=type==='tga'?GlueExport.encodeTGA(pixels.bytes,pixels.width,pixels.height):await GlueExport.encodePNG(pixels.bytes,pixels.width,pixels.height);}
     name=`${base}_${raw.cols}x${raw.rows}_${raw.width}x${raw.height}.${type}`;
   }
   outputFile(blob,name);toast(`저장 완료: ${name} · ${(blob.size/1048576).toFixed(2)} MB`);
 }catch(e){console.error(e);toast(`익스포트 실패: ${e.message}`,true);}finally{unbusy();}
}
function bind(){
 // File input is opened synchronously from the user gesture. Also provide a native label in HTML as fallback.
 function chooseFile(id){const picker=$(id);if(!picker){toast('파일 선택 입력을 찾지 못했습니다. 페이지를 새로고침하세요.',true);return;}
   try{if(typeof picker.showPicker==='function')picker.showPicker();else picker.click();}
   catch(err){console.warn('[Glue Studio] showPicker fallback',err);try{picker.click()}catch(e){toast('파일 선택창을 열 수 없습니다. 직접 선택하기 버튼 또는 드래그 앤 드롭을 사용하세요.',true);}}}
 $('btnImport').addEventListener('click',()=>chooseFile('fileInput'));
 $('btnEmptyImport').addEventListener('click',()=>chooseFile('fileInput'));
 $('fileInput').addEventListener('change',e=>{const picker=e.currentTarget,files=Array.from(picker.files||[]);picker.value='';if(!files.length)return;
   const status=$('fileImportStatus');if(status)status.textContent=`선택한 ${files.length}개 파일을 불러오고 있습니다…`;
   Promise.resolve().then(()=>addFiles(files)).then(()=>{if(status)status.textContent=`가져오기 완료 · 현재 ${state.frames.length}프레임`;}).catch(err=>{console.error('[Glue Studio] import failure',err);if(status)status.textContent='불러오기 실패: '+err.message;toast('불러오기 실패: '+err.message,true);});
 });
 $('btnImportSheet').addEventListener('click',()=>chooseFile('sheetInput'));
 $('sheetInput').addEventListener('change',e=>{state.sliceFile=e.target.files?.[0];e.target.value='';if(state.sliceFile)$('sliceDialog').showModal();});
 $('sliceDialog').addEventListener('close',()=>{if($('sliceDialog').returnValue==='apply')sliceSheet(state.sliceFile);});
 $('btnHelp').addEventListener('click',()=>$('helpDialog').showModal());
 $('btnReset').addEventListener('click',()=>{for(let id of configIds){const el=$(id);if(el.type==='checkbox')el.checked=el.defaultChecked;else if(el.type==='color')el.value=el.defaultValue;else if(el.tagName==='SELECT')el.selectedIndex=0;else el.value=el.defaultValue;}alphaModeLast='off';alphaProfiles={off:[0,0],black:[0,0],white:[0,0],chroma:[25,30],opaque:[0,0]};updateAlphaUI();invalidate();toast('설정을 기본값으로 되돌렸습니다.');});
 $('btnNewProject')?.addEventListener('click',()=>{
  if(state.frames.length&&!confirm('현재 '+state.frames.length+'개 프레임과 편집 설정을 비우고 새 작업을 시작할까요?'))return;
  if(window.GlueV14?.resetWorkspace)window.GlueV14.resetWorkspace();else{stopPlay();disposeAll();}
  renderFrames();invalidate();updateStats();
  if($('importMode'))$('importMode').value='replace';
  window.GlueV15?.history?.resetHistory?.();
  window.GlueV16?.deleteSlot?.().catch?.(()=>{});
  const status=$('fileImportStatus');if(status)status.textContent='새 프로젝트 준비 완료 · 새 파일을 불러와 주세요.';
  toast('새 프로젝트를 시작합니다.');
  if($('newAutoPick')?.checked)chooseFile('fileInput');
 });
 $('btnSort').addEventListener('click',()=>{state.frames.sort((a,b)=>numeric.compare(a.name,b.name));state.selected=0;renderFrames();invalidate();});
 $('btnReverse').addEventListener('click',()=>{state.frames.reverse();state.selected=0;renderFrames();invalidate();});
 $('btnClear').addEventListener('click',()=>{if(!state.frames.length)return;if(!confirm(`${state.frames.length}개 프레임을 제거할까요?`))return;stopPlay();disposeAll();renderFrames();redraw();});
 document.querySelectorAll('[data-grid]').forEach(btn=>btn.addEventListener('click',()=>{$('columns').value=btn.dataset.grid;invalidate();}));
 document.querySelectorAll('[data-gifsize]').forEach(btn=>btn.addEventListener('click',()=>{$('gifW').value=btn.dataset.gifsize;$('gifH').value=btn.dataset.gifsize;updateStats();}));
 document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
 for(let id of configIds){$(id).addEventListener('input',()=>{if(['tolerance','feather','cutoff'].includes(id))$(id+'Val').textContent=$(id).value;if(['gifW','gifH','fps','gifThreshold','gifDither','gifTransparent','gifBg'].includes(id)){if(id==='gifTransparent')updateAlphaUI();updateStats();return;}if(id==='alphaMode'){switchAlphaProfile();updateAlphaUI();}invalidate();});}
 $('previewBg').addEventListener('change',redraw);$('showGrid').addEventListener('change',redraw);
 $('btnEyedrop').addEventListener('click',()=>{if(!checkNotEmpty())return;state.eyeDrop=true;setView('source');toast('원본 미리보기에서 제거할 배경색을 클릭하세요.');});
 $('preview').addEventListener('click',e=>{if(!state.eyeDrop||!state.frames.length)return;let rect=$('preview').getBoundingClientRect(),x=Math.floor((e.clientX-rect.left)/rect.width*$('preview').width),y=Math.floor((e.clientY-rect.top)/rect.height*$('preview').height);if(x<0||y<0||x>=$('preview').width||y>=$('preview').height)return;let pix=$('preview').getContext('2d').getImageData(x,y,1,1).data;$('keyColor').value='#'+[pix[0],pix[1],pix[2]].map(z=>z.toString(16).padStart(2,'0')).join('');state.eyeDrop=false;setView('anim');invalidate();toast('배경색을 추출했습니다: '+$('keyColor').value);});
 $('btnPrev').addEventListener('click',()=>setSelected(state.selected-1));$('btnNext').addEventListener('click',()=>setSelected(state.selected+1));$('btnPlay').addEventListener('click',togglePlay);
 $('scrub').addEventListener('input',()=>setSelected(Number($('scrub').value)));
 $('exportPng').addEventListener('click',()=>runExport('png'));$('exportTga').addEventListener('click',()=>runExport('tga'));$('exportGif').addEventListener('click',()=>runExport('gif'));
 $('btnFit').addEventListener('click',fitZoom);$('btnZoomIn').addEventListener('click',()=>{state.autoFit=false;state.zoom=clamp(state.zoom*1.3,.025,8);applyZoom();});$('btnZoomOut').addEventListener('click',()=>{state.autoFit=false;state.zoom=clamp(state.zoom/1.3,.025,8);applyZoom();});
 const stage=$('stage');stage.addEventListener('wheel',e=>{if(!state.frames.length)return;e.preventDefault();state.autoFit=false;state.zoom=clamp(state.zoom*(e.deltaY>0?.85:1.15),.025,8);applyZoom();},{passive:false});
 let pointer=null;stage.addEventListener('pointerdown',e=>{if(e.button!==0||!state.frames.length)return;if(state.eyeDrop)return;pointer={x:e.clientX,y:e.clientY,px:state.panX,py:state.panY};stage.classList.add('dragging');stage.setPointerCapture(e.pointerId);});stage.addEventListener('pointermove',e=>{if(!pointer)return;state.autoFit=false;state.panX=pointer.px+e.clientX-pointer.x;state.panY=pointer.py+e.clientY-pointer.y;applyZoom();});function release(){pointer=null;stage.classList.remove('dragging');}stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
 document.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});
 document.addEventListener('drop',e=>{if(e.dataTransfer?.files?.length){e.preventDefault();stage.classList.remove('dropover');addFiles(e.dataTransfer.files);}});
 stage.addEventListener('dragenter',e=>{if(e.dataTransfer?.types.includes('Files'))stage.classList.add('dropover');});stage.addEventListener('dragleave',()=>stage.classList.remove('dropover'));
 window.addEventListener('resize',()=>{if(state.autoFit&&state.frames.length)fitZoom();});
 document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;if(e.key===' '){e.preventDefault();togglePlay();}else if(e.key==='ArrowLeft')setSelected(state.selected-1);else if(e.key==='ArrowRight')setSelected(state.selected+1);});
}
updateAlphaUI();bind();$('stage').classList.add('bg-checker');updateStats();
// expose a small test API for local regression checks (does not send or store images).
window.__GlueTest={alphaProcess,applyBleed,sheetRaw,readConf,state,dimensions,buildFrame,addFiles,sliceSheet,disposeAll,renderFrames,invalidate,toast,busy,unbusy,stopPlay,setView};
})();
