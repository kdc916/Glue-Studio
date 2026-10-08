/* maxVFX Glue Studio v1.5.0 — Undo/Redo (non-destructive edits), Atlas QA and smart layout.
 * No CDNs; avoids touching legacy image encoding and GIF disposal paths.
 */
(async () => {
'use strict';
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
for (let i=0; i<400 && !(window.__GlueTest && window.GlueV14 && window.GlueV13 && window.__GlueV11Test && window.__GlueV12Test && $('v14Save')); i++)
  await new Promise(r=>setTimeout(r,20));
if (!(window.__GlueTest && window.GlueV14 && window.GlueV13 && window.__GlueV11Test && window.__GlueV12Test)) { console.error('Glue v1.5: missing required modules'); return; }
const core=window.__GlueTest, state=core.state, pivot=window.__GlueV11Test.v11;
const configIds=['tileW','tileH','columns','gap','padding','fit','trim','power2','alphaMode','keyColor','tolerance','feather','cutoff','bleed',
'gifW','gifH','fps','gifThreshold','gifDither','gifTransparent','gifBg','v13Align','v13Edge','v13EdgeAmount','v13Matte','v13Timing',
'previewSpeed','pivotX','pivotY','channelMode','gifImportLayout','importMode'];
const interactive=new Set([...configIds,'v13Duration']);
const mutationButtons=new Set(['btnSort','btnReverse','btnReset','pivotAll','pivotSingle','pivotClear','v13ResetTimes']);
const maxHistory=35;
const info={undo:[],redo:[],baseline:null,restoring:false,timer:null,pending:null,sourceSignature:''};
const sourceSig=()=>state.frames.map(f=>f.id).slice().sort((a,b)=>a-b).join(':');
const snapshot=()=>({
  frames:state.frames.map(f=>({id:f.id,durationMs:f.durationMs==null?null:Math.round(Number(f.durationMs))})),
  fields:Object.fromEntries(configIds.filter(id=>$(id)).map(id=>[id,$(id).type==='checkbox'?$(id).checked:$(id).value])),
  pivotDefault:{x:pivot.defaultPivot.x,y:pivot.defaultPivot.y},
  pivotOverrides:[...pivot.pivots.entries()].filter(([id])=>state.frames.some(f=>f.id===id)).map(([id,v])=>[id,{x:v.x,y:v.y}]).sort((a,b)=>a[0]-b[0]),
  selectedId:state.frames[state.selected]?.id??null
});
const comparable=s=>JSON.stringify([s.frames,s.fields,s.pivotDefault,s.pivotOverrides]);
function resetHistory(){clearTimeout(info.timer);info.undo=[];info.redo=[];info.pending=null;info.sourceSignature=sourceSig();info.baseline=snapshot();refreshButtons();}
function ensureSource(){if(sourceSig()!==info.sourceSignature){resetHistory();return false;}return true;}
function refreshButtons(){const undo=$('v15Undo'),redo=$('v15Redo');if(undo){undo.disabled=!info.undo.length;undo.title=`실행 취소: ${info.undo.length}단계 (Ctrl+Z)`;}if(redo){redo.disabled=!info.redo.length;redo.title=`다시 실행: ${info.redo.length}단계 (Ctrl+Shift+Z)`;}
 const status=$('v15HistoryStatus');if(status)status.textContent=`되돌리기 ${info.undo.length} · 다시 실행 ${info.redo.length} · 최대 ${maxHistory}단계`;
}
function markBefore(){if(info.restoring||state.busy)return; if(!ensureSource())return;
 if(!info.pending) info.pending=info.baseline;
}
function markAfter(debounce=100){if(info.restoring||state.busy)return;clearTimeout(info.timer);info.timer=setTimeout(commit,debounce);}
function commit(){info.timer=null;if(info.restoring)return;if(!ensureSource())return;
 const after=snapshot(),before=info.pending||info.baseline; info.pending=null;
 if(comparable(after)!==comparable(before)){
   info.undo.push(before);if(info.undo.length>maxHistory)info.undo.shift();info.redo=[];
 }
 info.baseline=after;refreshButtons();
}
function apply(s){info.restoring=true;
 try{
   const map=new Map(state.frames.map(f=>[f.id,f]));
   if(s.frames.length!==state.frames.length || s.frames.some(f=>!map.has(f.id)))throw Error('이미지 목록이 변경되어 이력을 복원할 수 없습니다.');
   state.frames.splice(0,state.frames.length,...s.frames.map(f=>map.get(f.id)));
   for(const f of s.frames)map.get(f.id).durationMs=f.durationMs==null?undefined:f.durationMs;
   for(const [id,value] of Object.entries(s.fields)){const el=$(id);if(!el)continue;if(el.type==='checkbox')el.checked=Boolean(value);else el.value=value;}
   pivot.defaultPivot={...s.pivotDefault};pivot.pivots.clear();
   for(const [id,v] of s.pivotOverrides)pivot.pivots.set(id,{...v});
   const sel=s.selectedId==null?-1:state.frames.findIndex(f=>f.id===s.selectedId);
   state.selected=sel>=0?sel:clamp(state.selected,0,Math.max(0,state.frames.length-1));
   for(const id of ['tolerance','feather','cutoff'])if($(id+'Val'))$(id+'Val').textContent=$(id).value;
   if($('v13EdgeValue'))$('v13EdgeValue').textContent=$('v13EdgeAmount').value+'%';
   if($('v13MatteHolder'))$('v13MatteHolder').hidden=$('v13Edge').value!=='custom';
   if($('chromaControls'))$('chromaControls').hidden=$('alphaMode').value!=='chroma';
   if($('alphaControls'))$('alphaControls').hidden=$('alphaMode').value==='opaque';
   if($('gifBgField'))$('gifBgField').hidden=$('gifTransparent').checked;
   window.__GlueV12Test.setSpeed(Number($('previewSpeed').value)||1);
   core.stopPlay();window.__GlueV12Test.stop?.();
   core.renderFrames();core.invalidate();$('scrub').value=state.selected;
   $('scrub').dispatchEvent(new Event('input',{bubbles:true}));
   setTimeout(()=>{if($('v15QualityResult'))$('v15QualityResult').textContent='설정이 변경되었습니다. 다시 검사해 주세요.';},0);
 }finally{info.restoring=false;}
}
function undo(){if(!ensureSource())return;if(info.timer)commit();if(!info.undo.length)return;
 const previous=info.undo.pop(),current=snapshot(); info.redo.push(current);try{apply(previous);info.baseline=snapshot();}catch(e){resetHistory();core.toast(e.message,true);}refreshButtons();}
function redo(){if(!ensureSource())return;if(info.timer)commit();if(!info.redo.length)return;
 const next=info.redo.pop(),current=snapshot();info.undo.push(current);try{apply(next);info.baseline=snapshot();}catch(e){resetHistory();core.toast(e.message,true);}refreshButtons();}
// Source addition/removal (including async GIF and project import) intentionally resets the history.
// Undo stores only frame ids/settings, never closed ImageBitmaps; this avoids retaining large textures.
document.addEventListener('click',e=>{const button=e.target.closest('button');if(info.restoring)return;
 if(button && (mutationButtons.has(button.id)||button.dataset.presetPivot||button.dataset.grid||button.dataset.gifsize)){
   markBefore();markAfter(150);
 } else if(e.target.closest('#preview') && $('pivotEdit')?.checked){markBefore();markAfter(150);}
 else if(e.target.closest('#frames .remove')){setTimeout(resetHistory,80);}
},true);
document.addEventListener('input',e=>{if(info.restoring||!interactive.has(e.target.id))return;markBefore();markAfter(280);},true);
document.addEventListener('change',e=>{if(info.restoring)return;if(interactive.has(e.target.id)){markBefore();markAfter(130);}
 if(e.target.id==='fileInput'||e.target.id==='sheetInput')setTimeout(()=>ensureSource(),500);
},true);
document.addEventListener('drop',e=>{if(e.target.closest('#frames')){markBefore();markAfter(130);}else if(e.dataTransfer?.files?.length){setTimeout(()=>ensureSource(),500);}},true);
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey||document.querySelector('dialog[open]'))return;
 if(['INPUT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable)return;
 const key=e.key.toLowerCase();if(key==='z'){e.preventDefault();e.stopImmediatePropagation();e.shiftKey?redo():undo();}else if(key==='y'){e.preventDefault();e.stopImmediatePropagation();redo();}
},true);

function estimateLayout(c,count,columns){let cols=Math.min(Math.max(1,Math.round(columns)),count),rows=Math.ceil(count/cols);
 let w=2*c.padding+cols*c.tileW+(cols-1)*c.gap,h=2*c.padding+rows*c.tileH+(rows-1)*c.gap;
 if(c.power2){const p=n=>{let v=1;while(v<n)v*=2;return v;};w=p(w);h=p(h);}return {cols,rows,width:w,height:h,area:w*h,ratio:w/h};}
function recommendLayout(c,count){if(!count)return null;let best=null;
 for(let cols=1;cols<=Math.min(count,128);cols++){
  const layout=estimateLayout(c,count,cols);
  if(layout.width>8192||layout.height>8192||layout.area>45000000)continue;
  // 70% occupancy/texture-memory, 30% near-square atlas; no resampling or frame rearrangement.
  const score=layout.area*(1+0.12*Math.abs(Math.log(layout.ratio)));
  if(!best||score<best.score)best={...layout,score};
 }
 return best;
}
function inspectPixels(data,w,h,stride=1){let visible=0,trans=0,partial=0,touch=0,hash=2166136261;
 for(let y=0;y<h;y+=stride)for(let x=0;x<w;x+=stride){const i=(y*w+x)*4,a=data[i+3];
  if(a>8)visible++;if(a===0)trans++;else if(a<250)partial++;if(a>96&&(x<stride||y<stride||x>=w-stride||y>=h-stride))touch++;
  for(let k=0;k<4;k++){hash=Math.imul(hash^data[i+k],16777619)>>>0;}
 }
 return {visible,transparent:trans,partial,edge:touch,hash:hash.toString(16),sampled:Math.ceil(w/stride)*Math.ceil(h/stride)};
}
async function diagnose(){const count=state.frames.length,c=core.readConf(),warnings=[],frames=[],layout=count?estimateLayout(c,count,c.columns):null;
 if(!count){warnings.push({level:'warning',code:'EMPTY',message:'먼저 이미지나 GIF를 추가하세요.'});return {version:'1.5.0',count,layout:null,warnings,frames};}
 if(layout.width>8192||layout.height>8192||layout.area>45000000)warnings.push({level:'error',code:'SHEET_LIMIT',message:`시트 ${layout.width}×${layout.height}: 내보내기 제한(8192px / 4500만 픽셀)을 초과합니다.`});
 if(layout.width>4096||layout.height>4096)warnings.push({level:'warning',code:'LARGE_TEXTURE',message:'4096px 초과 텍스처입니다. 대상 플랫폼의 최대 텍스처 크기와 VRAM을 확인하세요.'});
 if(c.gap===0&&!c.bleed)warnings.push({level:'info',code:'FILTER_BLEED',message:'Gap 0px + Alpha Bleed OFF입니다. 밉맵/선형 필터에서 경계 누출 가능성을 확인하세요.'});
 if(c.trim&&$('v13Align')?.value==='legacy')warnings.push({level:'warning',code:'TRIM_JITTER',message:'Trim + 기존 중심 배치는 프레임별 위치가 흔들릴 수 있습니다.'});
 if(c.power2&&layout.area > count*c.tileW*c.tileH*2)warnings.push({level:'info',code:'WASTED_AREA',message:'2의 거듭제곱 확장으로 빈 공간이 큽니다. 자동 그리드를 권장합니다.'});
 if(c.tileW>2048||c.tileH>2048)warnings.push({level:'info',code:'FRAME_SIZE',message:'프레임 크기가 2048px을 넘습니다. 다운스케일 필요 여부를 확인하세요.'});
 if(c.fps>30&&count>64)warnings.push({level:'info',code:'GIF_WORK',message:'긴 고FPS GIF는 파일 크기와 인코딩 시간이 커질 수 있습니다.'});
 const perFramePixels=c.tileW*c.tileH;
 if(perFramePixels>7500000){
  warnings.push({level:'warning',code:'SCAN_SKIPPED',message:'개별 프레임이 750만 픽셀을 초과하여 브라우저 메모리 보호를 위해 픽셀 검사를 생략했습니다.'});
  return {version:'1.5.0',generatedAt:new Date().toISOString(),count,scanCount:0,stride:0,layout,recommended:recommendLayout(c,count),estimatedRgbaMiB:Number((layout.area*4/1048576).toFixed(2)),warnings,frames};
 }
 let scanCount=Math.min(count,Math.max(1,Math.min(64,Math.floor(14000000/perFramePixels))));
 const stride=Math.max(1,Math.ceil(Math.sqrt(scanCount*perFramePixels/3500000)));
 const signatures=new Map();
 for(let n=0;n<scanCount;n++){
  if(sourceSig()!==info.sourceSignature)throw Error('검사 도중 이미지 목록이 변경됐습니다.');
  const index=scanCount===1?0:Math.round(n*(count-1)/(scanCount-1));
  const rgba=core.buildFrame(state.frames[index],c),stats=inspectPixels(rgba,c.tileW,c.tileH,stride);
  const coverage=stats.visible/Math.max(1,stats.sampled);
  const entry={index,name:state.frames[index].name,coverage:Number((coverage*100).toFixed(2)),alphaEdges:stats.edge,issues:[]};
  if(coverage===0)entry.issues.push('완전 투명');
  else if(coverage<0.002)entry.issues.push('표시 픽셀 극히 적음');
  if(stats.edge>0&&coverage<0.85)entry.issues.push('가장자리 알파 접촉');
  const prev=signatures.get(stats.hash);
  if(prev!=null)entry.issues.push(`${prev+1}번과 샘플 유사`);
  else signatures.set(stats.hash,index);
  if(entry.issues.length){frames.push(entry);warnings.push({level:coverage===0?'warning':'info',code:'FRAME',frame:index,message:`프레임 ${index+1}: ${entry.issues.join(' / ')}`});}
  if(n%4===0)await new Promise(r=>requestAnimationFrame(r));
 }
 const best=recommendLayout(c,count),before=layout;
 return {version:'1.5.0',generatedAt:new Date().toISOString(),count,scanCount,stride,layout:before,recommended:best,
  estimatedRgbaMiB:Number((before.area*4/1048576).toFixed(2)),warnings,frames};
}
let lastReport=null,checking=false;
function paintReport(report){const list=$('v15QualityResult');list.replaceChildren();
 if(!report.warnings.length){const ok=document.createElement('p');ok.textContent='점검 항목에서 특이사항이 발견되지 않았습니다. 실제 엔진 렌더링 테스트를 대체하지는 않습니다.';list.append(ok);}
 else for(const item of report.warnings.slice(0,80)){
   const el=document.createElement(item.frame!=null?'button':'div');el.className='v15-issue '+item.level;
   const mark=document.createElement('strong');mark.textContent=item.level==='error'?'오류':item.level==='warning'?'주의':'참고';
   const txt=document.createElement('span');txt.textContent=item.message;el.append(mark,txt);
   if(item.frame!=null){el.type='button';el.title='프레임 선택';el.addEventListener('click',()=>{$('scrub').value=item.frame;$('scrub').dispatchEvent(new Event('input',{bubbles:true}));});}
   list.append(el);
 }
 $('v15Stats').textContent=report.layout?`${report.count}프레임 · ${report.layout.width}×${report.layout.height} · RGBA 약 ${report.estimatedRgbaMiB}MiB · ${report.scanCount}/${report.count}프레임 표본 검사`:'이미지 없음';
 $('v15Download').disabled=false;
}
async function runQuality(){if(checking||state.busy)return;checking=true;$('v15Check').disabled=true;$('v15QualityResult').textContent='프레임을 검사하고 있습니다…';
 try{ensureSource();lastReport=await diagnose();paintReport(lastReport);}catch(e){$('v15QualityResult').textContent='검사 실패: '+e.message;}
 finally{checking=false;$('v15Check').disabled=false;}
}
function optimize(){if(!state.frames.length)return core.toast('먼저 이미지를 불러오세요.',true);if(state.busy)return;
 const c=core.readConf(),before=estimateLayout(c,state.frames.length,c.columns),best=recommendLayout(c,state.frames.length);
 if(!best)return core.toast('현재 프레임 크기에서 출력 제한을 만족하는 배치를 찾지 못했습니다.',true);
 if(before.cols===best.cols)return core.toast(`이미 적합한 그리드입니다: ${before.cols}열 · ${before.width}×${before.height}`);
 markBefore();$('columns').value=best.cols;core.invalidate();markAfter(80);
 core.toast(`자동 레이아웃: ${before.cols}열 ${before.width}×${before.height} → ${best.cols}열 ${best.width}×${best.height}`);
 $('v15QualityResult').textContent='그리드가 변경되었습니다. 다시 검사해 주세요.';
}
function downloadReport(){if(!lastReport)return;const blob=new Blob([JSON.stringify(lastReport,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='maxVFX_GlueStudio_QualityReport.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function mount(){
 const frameActions=$('btnSort').parentElement;
 const group=document.createElement('span');group.className='v15-history';group.innerHTML='<button id="v15Undo" class="small-btn" type="button" disabled>↶ 실행 취소</button><button id="v15Redo" class="small-btn" type="button" disabled>↷ 다시 실행</button>';
 frameActions.prepend(group);
 const status=document.createElement('p');status.className='small-muted v15-history-status';status.id='v15HistoryStatus';status.textContent='설정·순서·Pivot·프레임 시간 복원 (프레임 추가/제거 제외)';frameActions.parentElement.append(status);
 const panel=document.createElement('section');panel.className='v15-panel';panel.innerHTML=`<div class="v15-heading"><div><small>ATLAS QUALITY CHECK · v1.5</small><h3>출력 품질 검사</h3></div><div class="v15-actions"><button id="v15Check" class="small-btn" type="button">품질 검사</button><button id="v15Optimize" class="small-btn" type="button">자동 그리드 최적화</button><button id="v15Download" class="small-btn" type="button" disabled>진단 JSON 저장</button></div></div><p id="v15Stats" class="small-muted">검사를 실행하면 시트 크기, 메모리, 투명 프레임, 잘림 가능성을 확인합니다.</p><div id="v15QualityResult" class="v15-issues">파일 처리 없이 검사 결과를 표시합니다.</div><p class="small-muted">진단은 표본 기반 참고 결과이며, 엔진 내 실제 텍스처 필터링과 렌더 검증을 대체하지 않습니다.</p>`;
 const projectPanel=$('v14Save')?.closest('.v14-panel');(projectPanel||$('exportPng').closest('.export-panel')).after(panel);
 const style=document.createElement('style');style.textContent=`.v15-history{display:inline-flex;gap:5px;flex-wrap:wrap}.v15-history-status{margin-top:3px}.v15-panel{background:#19232d;border:1px solid #455a71;border-radius:12px;padding:17px;margin-top:12px;display:grid;gap:11px}.v15-heading{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap}.v15-heading small{font-size:10px;letter-spacing:1.4px;color:#9bbad5}.v15-heading h3{margin:5px 0;font-size:16px}.v15-actions{display:flex;gap:6px;flex-wrap:wrap}.v15-actions button{min-height:37px}.v15-issues{display:grid;gap:6px;max-height:340px;overflow:auto}.v15-issue{display:flex;gap:10px;align-items:start;background:#111a24;border:1px solid #334457;border-radius:6px;padding:8px;color:#d8e5ef;text-align:left;width:100%;font:inherit}.v15-issue strong{color:#8ec6e2;font-size:11px;min-width:28px}.v15-issue.warning strong{color:#f0cb70}.v15-issue.error strong{color:#ff8c87}.v15-issue span{font-size:12px;line-height:1.5}.v15-issue button{width:100%}@media(max-width:560px){.v15-actions{width:100%}.v15-actions button{flex:1}.v15-history{width:100%}}`;
 document.head.append(style);
 $('v15Undo').addEventListener('click',undo);$('v15Redo').addEventListener('click',redo);
 $('v15Check').addEventListener('click',runQuality);$('v15Optimize').addEventListener('click',optimize);$('v15Download').addEventListener('click',downloadReport);
 $('helpDialog').querySelector('ol')?.insertAdjacentHTML('beforeend','<li>v1.5의 실행 취소/다시 실행은 설정·순서·Pivot·재생시간에 적용됩니다. 프레임 추가·제거·프로젝트 교체는 이력에서 제외됩니다.</li><li>품질 검사에서 빈 프레임, 시트 해상도, 프레임 잘림 가능성을 확인하고 자동 그리드로 공간 사용을 최적화할 수 있습니다.</li>');
 resetHistory();
}
window.GlueV15={inspectPixels,estimateLayout,recommendLayout,diagnose,history:{undo,redo,commit,resetHistory,getState:()=>({undo:info.undo.length,redo:info.redo.length})},runQuality,optimize};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
