/* maxVFX Glue Studio v1.2.0 — independent preview-speed transport + Unreal per-frame CSV */
(()=>{'use strict';
const core=window.__GlueTest;
if(!core){console.error('Glue Studio v1.2: base app was not loaded');return;}
const $=id=>document.getElementById(id),s=core.state;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const playback={playing:false,handle:0,last:0,accumulated:0,speed:1};
function exportFps(){return clamp(Number($('fps').value)||12,1,50);}
function effectiveFps(){return exportFps()*playback.speed;}
function updateLabel(){if(!$('speedMultiplier'))return;$('speedMultiplier').value=playback.speed.toFixed(2).replace(/\.?0+$/,'')+'×';$('speedEffective').textContent=effectiveFps().toFixed(2).replace(/0+$/,'').replace(/\.$/,'')+' FPS';}
function setSpeed(value){const n=Number(value);playback.speed=Number.isFinite(n)?clamp(Math.round(n*20)/20,.1,4):1;$('previewSpeed').value=playback.speed;playback.accumulated=0;playback.last=performance.now();updateLabel();document.querySelectorAll('[data-preview-speed]').forEach(btn=>btn.classList.toggle('active',Math.abs(Number(btn.dataset.previewSpeed)-playback.speed)<.001));}
function select(index){if(!s.frames.length)return;const n=((index%s.frames.length)+s.frames.length)%s.frames.length;$('scrub').value=n;$('scrub').dispatchEvent(new Event('input',{bubbles:true}));}
function stop(){playback.playing=false;cancelAnimationFrame(playback.handle);playback.handle=0;playback.accumulated=0;$('btnPlay').textContent='▶';$('btnPlay').setAttribute('aria-label','애니메이션 재생');}
function tick(now){if(!playback.playing)return;if(!s.frames.length){stop();return;}const elapsed=clamp(now-playback.last,0,250);playback.last=now;playback.accumulated+=elapsed*effectiveFps()/1000;const steps=Math.floor(playback.accumulated);if(steps>=1){playback.accumulated-=steps;select(s.selected+steps);}playback.handle=requestAnimationFrame(tick);}
function toggle(){if(playback.playing){stop();return;}if(!s.frames.length){const t=$('toast');t.textContent='재생할 프레임을 먼저 추가하세요.';t.className='visible error';setTimeout(()=>t.className='',2500);return;}if(s.view==='sheet')document.querySelector('[data-view="anim"]').click();if(s.view==='source')document.querySelector('[data-view="anim"]').click();playback.playing=true;playback.last=performance.now();playback.accumulated=0;$('btnPlay').textContent='Ⅱ';$('btnPlay').setAttribute('aria-label','애니메이션 일시정지');playback.handle=requestAnimationFrame(tick);}
function make(tag,cls,html){const el=document.createElement(tag);el.className=cls;el.innerHTML=html;return el;}
function safeName(){return(s.frames[0]?.name||'maxVFX_Flipbook').replace(/\.[^.]+$/,'').replace(/(?:[_\s.-]?\d+)+$/,'').replace(/[^a-zA-Z0-9가-힣_-]/g,'_').slice(0,45)||'maxVFX_Flipbook';}
function saveFile(text,name,mime){const blob=new Blob([text],{type:mime});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),15000);}
function exportCSV(){if(!s.frames.length)return;const v11=window.__GlueV11Test;if(!v11)return;const meta=v11.buildMetadata();const headers=['frame','name','rectX','rectY','rectW','rectH','uTopLeft','vTopLeft','uWidth','vHeight','pivotX','pivotY','fps','sheetW','sheetH','columns','rows'];const esc=(value)=>'"'+String(value).replace(/"/g,'""')+'"';const lines=[headers.join(',')];for(const f of meta.frames){lines.push([f.index,f.name,f.rect.x,f.rect.y,f.rect.width,f.rect.height,f.uv.u,f.uv.v,f.uv.width,f.uv.height,f.pivot.x,f.pivot.y,meta.animation.fps,meta.sheet.width,meta.sheet.height,meta.sheet.columns,meta.sheet.rows].map(esc).join(','));}saveFile('\ufeff'+lines.join('\r\n'),safeName()+'_UnrealFlipbook.csv','text/csv;charset=utf-8');}
function mount(){
 const bar=$('stage')?.parentElement?.querySelector('.playbar');if(!bar)return;
 const panel=make('section','v12-transport',`<div class="v12-speed-row"><label for="previewSpeed"><b>미리보기 재생속도</b> <output id="speedMultiplier">1×</output></label><span id="speedEffective">12 FPS</span></div><input id="previewSpeed" type="range" min="0.1" max="4" step="0.05" value="1" aria-label="애니메이션 미리보기 속도"><div class="v12-preset-line"><div class="v12-speed-presets"><button data-preview-speed="0.25">0.25×</button><button data-preview-speed="0.5">0.5×</button><button data-preview-speed="1">1×</button><button data-preview-speed="2">2×</button><button data-preview-speed="4">4×</button></div><button class="small-btn" id="syncGifFps" title="미리보기의 실효 FPS를 GIF 출력 FPS로 복사">GIF FPS 반영</button></div><p class="small-muted">재생 배속은 미리보기에만 적용됩니다. GIF 속도는 왼쪽 ‘재생 FPS’에서 설정하며, ‘GIF FPS 반영’으로 동기화할 수 있습니다.</p>`);
 bar.after(panel);
 const css=document.createElement('style');css.textContent=`.v12-transport{background:#17222e;border:1px solid #355164;border-radius:11px;padding:13px 16px;margin-top:7px;display:grid;gap:9px}.v12-speed-row,.v12-preset-line{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap}.v12-speed-row output{font-weight:800;color:#80eac5;margin-left:7px}.v12-speed-row>span{font-variant-numeric:tabular-nums;font-size:12px;color:#a5cce2}.v12-transport input[type=range]{width:100%;accent-color:#70d9bf}.v12-speed-presets{display:flex;gap:5px;flex-wrap:wrap}.v12-speed-presets button{border:1px solid #3a5463;background:#1d2d38;color:#dce9ec;padding:6px 10px;border-radius:7px;cursor:pointer}.v12-speed-presets button.active{background:#246b60;border-color:#70d9bf;color:white}.v12-transport .small-muted{margin:0}.v12-engine-btn{margin-left:5px}@media(max-width:600px){.v12-transport{padding:12px}.v12-preset-line>*{max-width:100%}}`;document.head.append(css);
 $('previewSpeed').addEventListener('input',e=>setSpeed(e.target.value));document.querySelectorAll('[data-preview-speed]').forEach(b=>b.addEventListener('click',()=>setSpeed(b.dataset.previewSpeed)));
 $('fps').addEventListener('input',updateLabel);$('syncGifFps').addEventListener('click',()=>{const synced=clamp(Math.round(effectiveFps()),1,50);$('fps').value=synced;$('fps').dispatchEvent(new Event('input',{bubbles:true}));updateLabel();});
 // Capture input before v1.0's legacy player. Single source of playback truth.
 $('btnPlay').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();toggle();},true);
 document.addEventListener('keydown',e=>{if(e.key!==' '||e.repeat||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;e.preventDefault();e.stopImmediatePropagation();toggle();},true);
 ['exportPng','exportTga','exportGif','exportTga','btnClear','btnReset'].forEach(id=>$(id)?.addEventListener('click',()=>{stop();if(id==='btnReset')setSpeed(1);},true));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 function insertCSV(){const e=$('metaJSON');if(!e||$('unrealCSV'))return false;const btn=document.createElement('button');btn.id='unrealCSV';btn.type='button';btn.className='small-btn v12-engine-btn';btn.textContent='Unreal CSV';e.after(btn);btn.addEventListener('click',exportCSV);return true;}
 if(!insertCSV()){const observer=new MutationObserver(()=>{if(insertCSV())observer.disconnect();});observer.observe(document.body,{subtree:true,childList:true});}
 $('btnReset').addEventListener('click',()=>setSpeed(1)); // Run after the legacy reset handler to refresh the displayed effective FPS.
 setSpeed(1);
}
window.__GlueV12Test={playback,setSpeed,effectiveFps,stop,toggle,exportCSV};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
