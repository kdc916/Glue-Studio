/* maxVFX Glue Studio v1.3.0 — alignment, alpha edge treatment, variable frame duration, source/result comparison.
   Offline extension; core exposes hooks for render/GIF and v1.1 metadata. */
(()=>{'use strict';
const core=window.__GlueTest, v12=window.__GlueV12Test;
if(!core||!v12){console.error('[Glue Studio v1.3] v1.0/v1.2 core missing');return;}
const $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const state=core.state, timing={playing:false,raf:0,last:0,remaining:0}, attrs={};
const frameMs=(f,fps)=>clamp(Math.round(Number(f?.durationMs)||1000/Math.max(1,Number(fps)||12)),20,60000);
function variableTiming(){return !!$('v13Timing')?.checked;}
function duration(frame,fps){return variableTiming()?frameMs(frame,fps):Math.round(1000/Math.max(1,fps||12));}
function frameDelays(frames,fps){return variableTiming()?frames.map(f=>frameMs(f,fps)):undefined;}
function sourceRect(frame,c,legacy){return $('v13Align')?.value==='source'?{x:0,y:0,w:frame.bitmap.width,h:frame.bitmap.height}:legacy;}
function maskCenter(data,w,h,mode){let sx=0,sy=0,total=0,l=w,t=h,r=-1,b=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const a=data[(y*w+x)*4+3];if(a<8)continue;
  l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
  if(mode==='weighted'){sx+=x*a;sy+=y*a;total+=a;}
 }
 if(r<0)return null;
 return mode==='weighted'?{x:sx/total,y:sy/total}:{x:(l+r)/2,y:(t+b)/2};
}
function recenter(data,w,h,mode){const center=maskCenter(data,w,h,mode);if(!center)return data;
 const dx=Math.round((w-1)/2-center.x),dy=Math.round((h-1)/2-center.y);
 if(dx===0&&dy===0)return data;
 const next=new Uint8ClampedArray(data.length);
 for(let y=0;y<h;y++){const destY=y+dy;if(destY<0||destY>=h)continue;
  for(let x=0;x<w;x++){const destX=x+dx;if(destX<0||destX>=w)continue;
   const from=(y*w+x)*4,to=(destY*w+destX)*4;
   next[to]=data[from];next[to+1]=data[from+1];next[to+2]=data[from+2];next[to+3]=data[from+3];
  }
 }
 return next;
}
function decontaminate(data,w,h,color,strength){if(strength<=0)return data;
 const bg=color==='white'?[255,255,255]:color==='custom'?parseHex($('v13Matte')?.value||'#000000'):[0,0,0];
 const k=strength/100;
 for(let i=0;i<data.length;i+=4){const a=data[i+3]/255;
  if(a<=0.04||a>=0.995)continue; // near-zero alpha is too unstable to unmatte.
  for(let ch=0;ch<3;ch++){
   const unmatted=clamp((data[i+ch]-bg[ch]*(1-a))/a,0,255);
   data[i+ch]=Math.round(data[i+ch]*(1-k)+unmatted*k);
  }
 }
 return data;
}
function parseHex(v){return [1,3,5].map(i=>parseInt(v.slice(i,i+2),16)||0);}
function process(pixels,w,h,c,frame){let rgba=pixels;
 const mode=$('v13Edge')?.value||'off';
 if(mode!=='off'&&c.alphaMode==='off')decontaminate(rgba,w,h,mode,Number($('v13EdgeAmount')?.value)||0);
 const alignment=$('v13Align')?.value||'legacy';
 if(alignment==='bbox'||alignment==='weighted')rgba=recenter(rgba,w,h,alignment);
 return rgba;
}
function invalidate(){state.cache.clear();state.cacheVersion++;$('tileW').dispatchEvent(new Event('input',{bubbles:true}));}
function baseName(){return(state.frames[0]?.name||'maxVFX_Flipbook').replace(/\.[^.]+$/,'').replace(/(?:[_\s.-]?\d+)+$/,'').replace(/[^a-zA-Z0-9가-힣_-]/g,'_').slice(0,45)||'maxVFX_Flipbook';}
function saveText(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);}
function metadata(){const v=window.__GlueV11Test;if(!v)return null;const m=v.buildMetadata();
 m.generator='maxVFX Glue Studio v1.3.0';m.animation.variableTiming=variableTiming();
 m.alpha.edgeMatte=$('v13Edge')?.value||'off';m.alpha.edgeStrength=Number($('v13EdgeAmount')?.value)||0;
 m.alignment=$('v13Align')?.value||'legacy';
 m.frames.forEach((f,i)=>{f.durationMs=duration(state.frames[i],m.animation.fps)});return m;}
function exportMetadata(){if(!state.frames.length)return;saveText(JSON.stringify(metadata(),null,2),baseName()+'_atlas.json','application/json');}
function csv(){if(!state.frames.length)return;
 const meta=metadata(), cols=['frame','name','rectX','rectY','rectW','rectH','uTopLeft','vTopLeft','uWidth','vHeight','pivotX','pivotY','durationMs','fps','sheetW','sheetH','columns','rows'];
 const q=x=>'"'+String(x).replace(/"/g,'""')+'"';
 const lines=[cols.join(',')];for(const f of meta.frames){const a=[f.index,f.name,f.rect.x,f.rect.y,f.rect.width,f.rect.height,f.uv.u,f.uv.v,f.uv.width,f.uv.height,f.pivot.x,f.pivot.y,f.durationMs,meta.animation.fps,meta.sheet.width,meta.sheet.height,meta.sheet.columns,meta.sheet.rows];lines.push(a.map(q).join(','));}
 saveText('\ufeff'+lines.join('\r\n'),baseName()+'_UnrealFlipbook.csv','text/csv;charset=utf-8');
}
function ensureSelected(){const f=state.frames[state.selected];if(!f)return;
 if($('v13FrameLabel'))$('v13FrameLabel').textContent=`#${state.selected+1} / ${state.frames.length} · ${f.name}`;
 if($('v13Duration'))$('v13Duration').value=frameMs(f,$('fps').value);
 if($('v13TimelineTotal'))$('v13TimelineTotal').textContent=`전체 ${Math.round(state.frames.reduce((a,f)=>a+duration(f,$('fps').value),0))}ms`;
}
function stop(){timing.playing=false;cancelAnimationFrame(timing.raf);timing.raf=0;timing.remaining=0;$('btnPlay').textContent='▶';$('btnPlay').setAttribute('aria-label','애니메이션 재생');}
function selectFrame(i){const n=state.frames.length;if(!n)return;const el=$('scrub');el.value=((i%n)+n)%n;el.dispatchEvent(new Event('input',{bubbles:true}));ensureSelected();}
function step(now){if(!timing.playing)return;
 const delta=clamp(now-timing.last,0,250)*v12.playback.speed;timing.last=now;
 let available=delta,guard=0;
 while(available>=timing.remaining&&guard<512){available-=timing.remaining;selectFrame(state.selected+1);timing.remaining=frameMs(state.frames[state.selected],$('fps').value);guard++;}
 timing.remaining-=available;
 timing.raf=requestAnimationFrame(step);
}
function toggle(){if(!state.frames.length)return;if(timing.playing){stop();return;}
 v12.stop();
 if(state.view==='sheet'||state.view==='source')document.querySelector('[data-view="anim"]').click();
 timing.playing=true;timing.last=performance.now();timing.remaining=frameMs(state.frames[state.selected],$('fps').value);
 $('btnPlay').textContent='Ⅱ';$('btnPlay').setAttribute('aria-label','애니메이션 일시정지');timing.raf=requestAnimationFrame(step);
}
function paintCompare(){const f=state.frames[state.selected];if(!f)return;
 const c=core.readConf(),w=f.bitmap.width,h=f.bitmap.height;
 const orig=$('v13Original'),res=$('v13Processed');
 if(!orig||!res)return;
 orig.width=w;orig.height=h;orig.getContext('2d').drawImage(f.bitmap,0,0);
 const bytes=core.buildFrame(f,c);res.width=c.tileW;res.height=c.tileH;
 res.getContext('2d').putImageData(new ImageData(bytes,c.tileW,c.tileH),0,0);
 $('v13CompareLabel').textContent=f.name;
}
function mount(){
 const controls=document.createElement('section');controls.className='panel v13-panel';
 controls.innerHTML=`<div class="section-title"><b class="step">06</b><h3>VFX 품질 보정</h3></div>
 <label class="field">중심 정렬 방식<select id="v13Align"><option value="legacy">기존 방식 · Legacy</option><option value="source">원본 좌표 고정 · Source</option><option value="bbox">알파 범위 자동 중앙</option><option value="weighted">알파 가중 중심 중앙</option></select></label>
 <p class="small-muted">원본 좌표 고정은 Trim 설정이 켜져 있어도 원래 위치를 유지합니다. 자동 중앙 정렬은 의도적인 움직임까지 바꿀 수 있습니다.</p>
 <label class="field">반투명 경계 색상 보정<select id="v13Edge"><option value="off">사용 안 함 · 기존 색 유지</option><option value="black">검정 매트 제거</option><option value="white">흰색 매트 제거</option><option value="custom">사용자 지정 매트 제거</option></select></label>
 <div class="range-row"><label for="v13EdgeAmount">보정 강도 <output id="v13EdgeValue">65%</output></label><input id="v13EdgeAmount" type="range" min="0" max="100" value="65"></div>
 <label class="field" id="v13MatteHolder" hidden>매트 색상<input id="v13Matte" type="color" value="#000000"></label>
 <p class="small-muted">경계 보정은 원본 알파 유지 모드에서만 적용됩니다. 검정·흰색 배경 자동 제거 모드에서는 RGB 복원이 이미 수행됩니다.</p>
 <button id="v13CompareOpen" type="button" class="secondary">◧ 원본 / 보정 결과 비교</button>`;
 const alpha=$('alphaMode').closest('.panel');alpha.after(controls);
 const timer=document.createElement('section');timer.className='v13-timer';timer.innerHTML=`<div class="v13-timer-title"><strong>프레임별 재생시간</strong><label class="checkline compact"><input type="checkbox" id="v13Timing">사용</label></div>
 <div class="v13-time-row"><span id="v13FrameLabel">프레임을 선택하세요</span><label>지속시간 <input id="v13Duration" type="number" min="20" max="60000" step="10" value="83"> ms</label></div>
 <div class="v13-time-row"><button id="v13ResetTimes" type="button" class="small-btn">전체 기본 FPS로 초기화</button><small id="v13TimelineTotal">전체 0ms</small></div>
 <p class="small-muted">프레임별 시간 사용 시 GIF 지연시간과 JSON/CSV에도 적용됩니다. GIF는 10ms 단위, 최소 20ms로 기록됩니다.</p>`;
 $('v12SpeedPlaceholder')?.after(timer);
 const speed=$('previewSpeed')?.closest('.v12-transport');if(speed)speed.after(timer);else $('stage').parentElement.append(timer);
 const dlg=document.createElement('dialog');dlg.id='v13CompareDialog';dlg.className='v13-compare-dialog';dlg.innerHTML=`<div class="v13-compare-head"><h3>원본 / 보정 결과</h3><button id="v13CompareClose" class="small-btn">닫기 ×</button></div><p id="v13CompareLabel" class="small-muted"></p><div class="v13-compare-grid"><div><b>원본</b><canvas id="v13Original"></canvas></div><div><b>처리 결과</b><canvas id="v13Processed"></canvas></div></div>`;document.body.append(dlg);
 const style=document.createElement('style');style.textContent=`.v13-panel{border-color:#355d63!important}.v13-panel .secondary{width:100%;margin-top:6px}.v13-timer{background:#17222e;border:1px solid #355164;border-radius:11px;padding:13px 16px;display:grid;gap:11px;margin-top:7px}.v13-timer-title,.v13-time-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.v13-timer-title strong{color:#b7eadf}.v13-time-row input{width:84px;min-height:34px;border:1px solid #4b666b;background:#102029;color:#e9f3f4;border-radius:7px;padding:5px}.v13-timer p{margin:0}.v13-time-row label{color:#9fc2c5;font-size:12px}.v13-time-row span{font-size:12px;max-width:270px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.v13-compare-dialog{border:1px solid #42636d;background:#14212b;color:#edf7f7;border-radius:13px;max-width:min(95vw,980px);width:900px;padding:18px}.v13-compare-head{display:flex;justify-content:space-between;align-items:center}.v13-compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.v13-compare-grid>div{min-width:0;display:grid;gap:8px}.v13-compare-grid canvas{width:100%;height:auto;max-height:62vh;object-fit:contain;image-rendering:auto;background-color:#202d35;background-image:linear-gradient(45deg,#344652 25%,transparent 25%),linear-gradient(-45deg,#344652 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#344652 75%),linear-gradient(-45deg,transparent 75%,#344652 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0}@media(max-width:600px){.v13-compare-grid{grid-template-columns:1fr}.v13-compare-dialog{padding:12px}}`;
 document.head.append(style);
 for(const id of ['v13Align','v13Edge','v13EdgeAmount','v13Matte'])$(id).addEventListener('input',()=>{if(id==='v13EdgeAmount')$('v13EdgeValue').textContent=$('v13EdgeAmount').value+'%';if(id==='v13Edge')$('v13MatteHolder').hidden=$('v13Edge').value!=='custom';invalidate();});
 $('v13Timing').addEventListener('change',()=>{stop();v12.stop();ensureSelected();});
 $('v13Duration').addEventListener('change',()=>{if(!state.frames.length)return;state.frames[state.selected].durationMs=clamp(Math.round(Number($('v13Duration').value)||1000/Math.max(1,Number($('fps').value)||12)),20,60000);ensureSelected();});
 $('v13ResetTimes').addEventListener('click',()=>{state.frames.forEach(f=>delete f.durationMs);stop();v12.stop();ensureSelected();});
 $('fps').addEventListener('input',ensureSelected);
 $('scrub').addEventListener('input',ensureSelected);
 for(const id of ['btnPrev','btnNext','btnSort','btnReverse','btnClear','btnReset'])$(id)?.addEventListener('click',()=>{stop();if(id==='btnReset'){$('v13Align').value='legacy';$('v13Edge').value='off';$('v13EdgeAmount').value='65';$('v13Matte').value='#000000';$('v13EdgeValue').textContent='65%';$('v13Timing').checked=false;invalidate();}setTimeout(ensureSelected,0);});
 $('frames').addEventListener('click',()=>setTimeout(ensureSelected,0));
 $('frames').addEventListener('drop',()=>setTimeout(ensureSelected,0));
 $('v13CompareOpen').addEventListener('click',()=>{if(!state.frames.length)return;paintCompare();dlg.showModal();});$('v13CompareClose').addEventListener('click',()=>dlg.close());
 // Use capture at WINDOW to preempt the v1.2 player only while variable timing is enabled.
 window.addEventListener('click',e=>{
  const target=e.target.closest?.('button');if(!target)return;
  if(target.id==='btnPlay'&&variableTiming()){e.preventDefault();e.stopImmediatePropagation();toggle();}
  if(target.id==='unrealCSV'){e.preventDefault();e.stopImmediatePropagation();csv();}
  if(target.id==='metaJSON'){e.preventDefault();e.stopImmediatePropagation();exportMetadata();}
  if(['exportPng','exportTga','exportGif'].includes(target.id))stop();
 },true);
 window.addEventListener('keydown',e=>{if(!variableTiming()||e.key!==' '||e.repeat||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;e.preventDefault();e.stopImmediatePropagation();toggle();},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 ensureSelected();
}
window.GlueV13={sourceRect,process,recenter,decontaminate,maskCenter,frameMs,frameDelays,variableTiming,duration,csv,metadata,exportMetadata,timing};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
