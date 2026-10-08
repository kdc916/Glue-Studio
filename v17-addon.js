/* maxVFX Glue Studio v1.7.0 — resilient file import and GIF encoding worker. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
let lastMode='대기',successes=0,fallbacks=0;
function status(message){lastMode=message;const item=$('v17WorkerStatus');if(item)item.textContent=message;}
async function encodeGif(frames,width,height,options,onProgress){
 if(typeof Worker==='undefined'||!window.GlueV17WorkerCode||typeof URL.createObjectURL!=='function'){
  fallbacks++;status('GIF 인코딩: 메인 스레드(브라우저 Worker 미지원)');return GlueGIF.encode(frames,width,height,options,onProgress);
 }
 let worker=null,url=null,timer=null;const token=Date.now()+Math.random();
 try{
  url=URL.createObjectURL(new Blob([window.GlueV17WorkerCode],{type:'text/javascript'}));worker=new Worker(url);
  // Send copies so the original frames remain valid for the synchronous fallback.
  const buffers=frames.map(f=>f.buffer.slice(f.byteOffset,f.byteOffset+f.byteLength));
  const output=await new Promise((resolve,reject)=>{
   let settled=false;const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value)};
   timer=setTimeout(()=>finish(Error('GIF Worker 응답 시간 초과')),120000);
   worker.onmessage=e=>{const m=e.data||{};if(m.id!==token)return;
     if(m.progress){onProgress?.(m.progress,m.total);return;}
     if(m.error){finish(Error(m.error));return;}
     if(m.done&&m.data instanceof ArrayBuffer)finish(null,new Blob([m.data],{type:'image/gif'}));
   };
   worker.onerror=e=>finish(Error(e.message||'GIF Worker 오류'));
   worker.postMessage({id:token,width,height,frames:buffers,opts:options},buffers);
  });
  successes++;status('GIF 인코딩: Web Worker 처리 완료');return output;
 }catch(error){console.warn('[Glue Studio v1.7] GIF Worker fallback:',error);fallbacks++;status('GIF Worker 실패, 일반 방식으로 자동 전환');return GlueGIF.encode(frames,width,height,options,onProgress);}
 finally{if(timer)clearTimeout(timer);if(worker)worker.terminate();if(url)URL.revokeObjectURL(url)}
}
function mount(){const target=$('exportGif');if(!target)return;
 const panel=target.closest('.export-panel');let label=document.getElementById('v17WorkerStatus');if(!label&&panel){label=document.createElement('p');label.id='v17WorkerStatus';label.className='export-status';label.setAttribute('role','status');label.textContent='GIF 출력: 백그라운드 인코딩 준비';panel.appendChild(label);}
 const help=$('helpDialog')?.querySelector('ol');help?.insertAdjacentHTML('beforeend','<li>파일 선택이 막힐 때는 첫 패널의 직접 선택하기를 누르거나 이미지를 화면에 드래그하세요. GIF 인코딩은 가능한 경우 Worker에서 실행합니다.</li>');
}
window.GlueV17={encodeGif,getStats:()=>({lastMode,successes,fallbacks})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
