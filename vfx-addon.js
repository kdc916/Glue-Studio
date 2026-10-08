/* maxVFX Glue Studio v1.1.0 — Channels + Pivot + Atlas Metadata. Offline / no dependencies. */
(()=>{'use strict';
const core=window.__GlueTest;
if(!core||!window.GlueExport){console.error('[Glue Studio] v1.1 addon: base app missing');return;}
const $=id=>document.getElementById(id), state=core.state;
const finite=(x,min,max,otherwise)=>{const n=Number(x);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):otherwise;};
const v11={pivots:new Map(),defaultPivot:{x:.5,y:.5},editing:false};
const make=(tag,props={},content='')=>{const el=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==='className')el.className=v;else if(k==='id')el.id=v;else el.setAttribute(k,v);}if(content)el.textContent=content;return el;};
function mount(){
 const layout=$('sidebar').querySelectorAll('.panel')[1];const pivotPanel=make('section',{className:'panel v11-panel'});
 pivotPanel.innerHTML=`<div class="section-title"><b class="step">05</b><h3>피벗 · Pivot Editor</h3></div>
  <p class="small-muted">정규화 피벗 기준: (0,0) 왼쪽 아래 · (0.5,0.5) 중앙 · (1,1) 오른쪽 위.</p>
  <div class="field-grid v11-fields"><label class="field">Pivot X <input id="pivotX" type="number" min="0" max="1" step="0.01" value="0.5"></label><label class="field">Pivot Y <input id="pivotY" type="number" min="0" max="1" step="0.01" value="0.5"></label></div>
  <div class="presets"><span>빠른 배치</span><button type="button" data-preset-pivot="0.5,0.5">중앙</button><button type="button" data-preset-pivot="0.5,0">하단</button><button type="button" data-preset-pivot="0,0">좌하</button><button type="button" data-preset-pivot="0.5,1">상단</button></div>
  <div class="v11-actions"><button id="pivotAll" class="small-btn" type="button">모든 프레임 적용</button><button id="pivotSingle" class="small-btn" type="button">선택 프레임 적용</button><button id="pivotClear" class="small-btn danger" type="button">개별 피벗 초기화</button></div>
  <label class="checkline"><input id="pivotEdit" type="checkbox"> 미리보기에서 클릭하여 피벗 배치</label><p id="pivotStatus" class="small-muted">공통 피벗: (0.50, 0.50)</p>`;
 layout.after(pivotPanel);
 const exportPanel=$('exportPng').closest('.export-panel');const channelBox=make('div',{className:'v11-export'});
 channelBox.innerHTML=`<div class="v11-export-title">CHANNEL &amp; METADATA EXPORT</div><div class="v11-export-row"><label class="field">채널 선택<select id="channelMode"><option value="rgb">RGB Only · Alpha 255</option><option value="alpha">Alpha Only · Grayscale</option></select></label><button id="channelPNG" class="small-btn" type="button">채널 PNG</button><button id="channelTGA" class="small-btn" type="button">채널 TGA</button><button id="metaJSON" class="small-btn" type="button">JSON 메타데이터</button></div><p class="small-muted">채널 출력은 기존 PNG/TGA와 별도 파일로 저장됩니다. JSON에는 엔진에서 활용할 UV 및 Pivot 좌표가 포함됩니다.</p>`;
 exportPanel.after(channelBox);
 const marker=make('div',{id:'pivotMarker',className:'pivot-marker'});marker.innerHTML='<span></span>';$('stage-inner').append(marker);
 const style=make('style',{id:'v11-style'});style.textContent=`.v11-panel{border-color:#3b5b65}.v11-fields{margin-top:13px}.v11-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.v11-export{background:#16212d;border:1px solid #375166;border-radius:12px;margin-top:10px;padding:17px}.v11-export-title{color:#73e1c1;font-size:10px;letter-spacing:1.8px;font-weight:800;margin-bottom:12px}.v11-export-row{display:flex;gap:9px;align-items:end;flex-wrap:wrap}.v11-export-row .field{min-width:170px;flex:1}.v11-export-row button{min-height:39px}.pivot-marker{position:absolute;width:22px;height:22px;border:2px solid #fcda69;border-radius:100%;transform:translate(-50%,-50%);box-shadow:0 0 0 1px #000,0 0 10px #0009;pointer-events:none;z-index:3;display:none}.pivot-marker:before,.pivot-marker:after{content:'';position:absolute;background:#fcda69}.pivot-marker:before{width:32px;height:2px;left:-7px;top:8px}.pivot-marker:after{width:2px;height:32px;left:8px;top:-7px}#stage.pivot-edit{cursor:crosshair}#pivotStatus{min-height:1.8em}@media(max-width:760px){.v11-panel{grid-column:1/-1}}@media(max-width:520px){.v11-export-row .field{flex-basis:100%}.v11-export-row button{flex:1}}`;
 document.head.append(style);
 $('pivotEdit').addEventListener('change',()=>{v11.editing=$('pivotEdit').checked;$('stage').classList.toggle('pivot-edit',v11.editing);if(v11.editing&&state.view==='source')document.querySelector('[data-view="anim"]').click();updateMarker();});
 for(const inp of ['pivotX','pivotY'])$(inp).addEventListener('input',()=>{v11.defaultPivot=fieldPivot();updateStatus();updateMarker();});
 document.querySelectorAll('[data-preset-pivot]').forEach(el=>el.addEventListener('click',()=>{const [x,y]=el.dataset.presetPivot.split(',').map(Number);$('pivotX').value=x;$('pivotY').value=y;v11.defaultPivot={x,y};updateStatus();updateMarker();}));
 $('pivotAll').addEventListener('click',()=>{v11.defaultPivot=fieldPivot();v11.pivots.clear();updateStatus('모든 프레임에 공통 피벗 적용');updateMarker();});
 $('pivotSingle').addEventListener('click',()=>{const fr=state.frames[state.selected];if(!fr)return notify('프레임을 추가하세요.',true);v11.pivots.set(fr.id,fieldPivot());updateStatus('선택 프레임에 개별 피벗 적용');updateMarker();});
 $('pivotClear').addEventListener('click',()=>{const fr=state.frames[state.selected];if(fr)v11.pivots.delete(fr.id);updateStatus('선택 프레임의 개별 피벗 해제');updateMarker();});
 $('channelPNG').addEventListener('click',()=>exportChannel('png'));
 $('channelTGA').addEventListener('click',()=>exportChannel('tga'));
 $('metaJSON').addEventListener('click',exportMetadata);
 $('preview').addEventListener('click',positionFromClick);
 // Base editor remains the authority for selection, frame ordering and view changes.
 const watcher=new MutationObserver(updateMarker);watcher.observe($('preview'),{attributes:true,attributeFilter:['width','height']});
 $('frames').addEventListener('click',()=>setTimeout(()=>{updateStatus();updateMarker();},0));
 $('scrub').addEventListener('input',()=>setTimeout(()=>{updateStatus();updateMarker();},0));
 $('btnPrev').addEventListener('click',()=>setTimeout(()=>{updateStatus();updateMarker();},0));
 $('btnNext').addEventListener('click',()=>setTimeout(()=>{updateStatus();updateMarker();},0));
 document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setTimeout(updateMarker,0)));
 $('btnSort').addEventListener('click',()=>setTimeout(updateMarker,0));$('btnReverse').addEventListener('click',()=>setTimeout(updateMarker,0));
 $('btnReset').addEventListener('click',()=>{v11.pivots.clear();v11.defaultPivot={x:.5,y:.5};$('pivotX').value=.5;$('pivotY').value=.5;updateStatus();updateMarker();});
 // Memory management: avoid retaining per-frame overrides after all files are removed.
 $('btnClear').addEventListener('click',()=>setTimeout(()=>{if(!state.frames.length){v11.pivots.clear();updateMarker();}},0));
 updateStatus();updateMarker();
 let lastFrame=-1,lastView='';function monitor(){if(state.selected!==lastFrame||state.view!==lastView){lastFrame=state.selected;lastView=state.view;updateStatus();updateMarker();}requestAnimationFrame(monitor);}requestAnimationFrame(monitor);
}
function notify(message,error=false){const t=$('toast');t.textContent=message;t.className='visible'+(error?' error':'');setTimeout(()=>{if(t.textContent===message)t.className='';},3600);}
function fieldPivot(){return{x:finite($('pivotX').value,0,1,.5),y:finite($('pivotY').value,0,1,.5)};}
function effectivePivot(frame){return v11.pivots.get(frame?.id)||v11.defaultPivot;}
function updateStatus(prefix=''){const f=state.frames[state.selected],p=effectivePivot(f);$('pivotStatus').textContent=`${prefix?prefix+' · ':''}${f&&v11.pivots.has(f.id)?'개별':'공통'} 피벗: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`;}
function markerCoord(){const frame=state.frames[state.selected];if(!frame)return null;const c=core.readConf(),d=core.dimensions(c),pivot=effectivePivot(frame);
 if(state.view==='source')return null;
 if(state.view==='sheet'){const idx=state.selected;return{x:c.padding+(idx%d.cols)*(c.tileW+c.gap)+pivot.x*c.tileW,y:c.padding+Math.floor(idx/d.cols)*(c.tileH+c.gap)+(1-pivot.y)*c.tileH};}
 return{x:pivot.x*c.tileW,y:(1-pivot.y)*c.tileH};
}
function updateMarker(){const m=$('pivotMarker');if(!m)return;const p=markerCoord();if(!p){m.style.display='none';return;}m.style.display='block';m.style.left=p.x+'px';m.style.top=p.y+'px';}
function positionFromClick(e){if(!v11.editing||state.view==='source'||!state.frames.length)return;const cvs=$('preview'),bounds=cvs.getBoundingClientRect();if(!bounds.width||!bounds.height)return;const x=(e.clientX-bounds.left)*cvs.width/bounds.width,y=(e.clientY-bounds.top)*cvs.height/bounds.height,c=core.readConf(),d=core.dimensions(c);
 let localX=x,localY=y,idx=state.selected;if(state.view==='sheet'){
  const relX=x-c.padding,relY=y-c.padding,stepX=c.tileW+c.gap,stepY=c.tileH+c.gap;
  const col=Math.floor(relX/stepX),row=Math.floor(relY/stepY);
  if(col<0||col>=d.cols||row<0||row>=d.rows)return;
  localX=relX-col*stepX;localY=relY-row*stepY;idx=row*d.cols+col;
  if(idx>=state.frames.length||localX<0||localY<0||localX>c.tileW||localY>c.tileH)return;
 }
 const p={x:finite(localX/c.tileW,0,1,.5),y:finite(1-localY/c.tileH,0,1,.5)};
 v11.pivots.set(state.frames[idx].id,p);$('pivotX').value=p.x.toFixed(3);$('pivotY').value=p.y.toFixed(3);
 if(idx!==state.selected){state.selected=idx;$('scrub').value=idx;$('playTime').textContent=`FRAME ${idx+1} / ${state.frames.length}`;document.querySelectorAll('.frame').forEach((el,i)=>el.classList.toggle('active',i===idx));}
 updateStatus('미리보기 클릭으로 지정');updateMarker();
}
function fileBase(){const s=state.frames[0]?.name||'maxVFX_Flipbook';return s.replace(/\.[^.]+$/,'').replace(/(?:[_\s.-]?\d+)+$/,'').replace(/[^a-zA-Z0-9가-힣_-]/g,'_').slice(0,45)||'maxVFX_Flipbook';}
function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=make('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
function transformChannels(data,mode){const out=new Uint8Array(data.length);for(let i=0;i<data.length;i+=4){if(mode==='alpha'){out[i]=out[i+1]=out[i+2]=data[i+3];}else{out[i]=data[i];out[i+1]=data[i+1];out[i+2]=data[i+2];}out[i+3]=255;}return out;}
async function exportChannel(type){if(!state.frames.length)return notify('이미지를 먼저 추가하세요.',true);if(state.busy)return;state.busy=true;try{
 const c=core.readConf(),atlas=core.sheetRaw(c),mode=$('channelMode').value,rgba=transformChannels(atlas.bytes,mode);
 const blob=type==='png'?await GlueExport.encodePNG(rgba,atlas.width,atlas.height):GlueExport.encodeTGA(rgba,atlas.width,atlas.height);
 saveBlob(blob,`${fileBase()}_${mode.toUpperCase()}_${atlas.width}x${atlas.height}.${type}`);notify(`${mode.toUpperCase()} 채널 ${type.toUpperCase()} 저장 완료`);
 }catch(error){console.error(error);notify('채널 출력 실패: '+error.message,true);}finally{state.busy=false;}}
function buildMetadata(){const c=core.readConf(),d=core.dimensions(c),stepX=c.tileW+c.gap,stepY=c.tileH+c.gap;
 if(d.width>8192||d.height>8192||d.width*d.height>45000000)throw Error('시트 해상도 제한을 초과했습니다.');
 return{schema:'maxvfx.glue-studio.atlas/1',generator:'maxVFX Glue Studio v1.1.0',sheet:{width:d.width,height:d.height,columns:d.cols,rows:d.rows,frameWidth:c.tileW,frameHeight:c.tileH,gap:c.gap,padding:c.padding,powerOfTwo:c.power2,coordinateOrigin:'top-left'},animation:{fps:c.fps,frameCount:state.frames.length,loop:true},alpha:{mode:c.alphaMode,bleed:c.bleed,cutoff:c.cutoff},frames:state.frames.map((f,i)=>{const x=c.padding+(i%d.cols)*stepX,y=c.padding+Math.floor(i/d.cols)*stepY,p=effectivePivot(f);
 return{index:i,name:f.name,rect:{x,y,width:c.tileW,height:c.tileH},unityRect:{x,y:d.height-y-c.tileH,width:c.tileW,height:c.tileH},uv:{u:x/d.width,v:y/d.height,width:c.tileW/d.width,height:c.tileH/d.height},pivot:{x:p.x,y:p.y},pivotPixelTopLeft:{x:p.x*c.tileW,y:(1-p.y)*c.tileH},overriddenPivot:v11.pivots.has(f.id)};
 }) ,engineNotes:{unity:'unityRect has bottom-left origin. pivot is normalized (0,0 bottom-left). Requires a custom sprite slicing/import script for automatic use.',unreal:'uv has top-left texture origin. Grid SubImage alone cannot consume individual pivots. Apply pivots in a custom material/module.'}};
}
function exportMetadata(){if(!state.frames.length)return notify('이미지를 먼저 추가하세요.',true);try{const json=JSON.stringify(buildMetadata(),null,2);saveBlob(new Blob([json],{type:'application/json'}),`${fileBase()}_atlas.json`);notify('Atlas JSON 저장 완료');}catch(e){notify(e.message,true);}}
window.__GlueV11Test={transformChannels,buildMetadata,effectivePivot,v11,positionFromClick};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
