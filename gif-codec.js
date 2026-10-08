/* maxVFX Glue Studio GIF89a encoder; global adaptive palette + LZW; no dependencies */
(function(global){
'use strict';
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function makePalette(frames,threshold,transparent,bg){
 const hist=new Map();
 for(const frame of frames){const stride=Math.max(1,Math.floor(frame.length/4/32000));
   for(let p=0;p<frame.length;p+=4*stride){const alpha=frame[p+3];if(transparent&&alpha<threshold)continue;
     let r=frame[p],g=frame[p+1],b=frame[p+2];if(!transparent&&alpha<255){let a=alpha/255;r=Math.round(r*a+bg[0]*(1-a));g=Math.round(g*a+bg[1]*(1-a));b=Math.round(b*a+bg[2]*(1-a));}
     const key=((r>>3)<<10)|((g>>3)<<5)|(b>>3);let v=hist.get(key);if(!v)hist.set(key,v=[0,0,0,0]);v[0]++;v[1]+=r;v[2]+=g;v[3]+=b;
   }
 }
 const values=Array.from(hist.values()).map(v=>({n:v[0],r:v[1]/v[0],g:v[2]/v[0],b:v[3]/v[0]}));
 if(!values.length)values.push({n:1,r:0,g:0,b:0});
 const limit=transparent?255:256;let boxes=[values];
 while(boxes.length<limit){let bi=-1,bscore=0,axis=0;
   for(let i=0;i<boxes.length;i++){let box=boxes[i];if(box.length<2)continue;let rs=[255,0],gs=[255,0],bs=[255,0],total=0;
     for(let c of box){rs[0]=Math.min(rs[0],c.r);rs[1]=Math.max(rs[1],c.r);gs[0]=Math.min(gs[0],c.g);gs[1]=Math.max(gs[1],c.g);bs[0]=Math.min(bs[0],c.b);bs[1]=Math.max(bs[1],c.b);total+=c.n;}
     const spans=[rs[1]-rs[0],gs[1]-gs[0],bs[1]-bs[0]];const a=spans.indexOf(Math.max(...spans));const score=spans[a]*Math.log2(total+1);
     if(score>bscore){bi=i;bscore=score;axis=a;}
   }
   if(bi<0)break;
   const box=boxes[bi];const key=['r','g','b'][axis];box.sort((a,b)=>a[key]-b[key]);let total=0;for(let c of box)total+=c.n;let half=0,k=0;
   for(;k<box.length-1;k++){half+=box[k].n;if(half>=total/2){k++;break;}}
   k=clamp(k,1,box.length-1);boxes.splice(bi,1,box.slice(0,k),box.slice(k));
 }
 const palette=new Uint8Array(768),start=transparent?1:0;
 for(let n=0;n<boxes.length;n++){let cnt=0,r=0,g=0,b=0;for(let c of boxes[n]){cnt+=c.n;r+=c.r*c.n;g+=c.g*c.n;b+=c.b*c.n;}
   palette[(n+start)*3]=Math.round(r/cnt);palette[(n+start)*3+1]=Math.round(g/cnt);palette[(n+start)*3+2]=Math.round(b/cnt);
 }
 return {palette,count:boxes.length+start,start};
}
function quantize(frame,w,h,options,pal,cache){
 const indices=new Uint8Array(w*h),colors=pal.palette;let pos=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++,pos++){
   const i=pos*4,a=frame[i+3];if(options.transparent&&a<options.threshold){indices[pos]=0;continue;}
   let r=frame[i],g=frame[i+1],b=frame[i+2];
   if(!options.transparent&&a<255){let s=a/255;r=r*s+options.bg[0]*(1-s);g=g*s+options.bg[1]*(1-s);b=b*s+options.bg[2]*(1-s);}
   if(options.dither){const d=(bayer[(y&3)*4+(x&3)]-7.5)*2;r=clamp(r+d,0,255);g=clamp(g+d,0,255);b=clamp(b+d,0,255);}
   let key=((r>>3)<<10)|((g>>3)<<5)|(b>>3),found=cache[key];
   if(found===0){let best=pal.start,dist=1e20;for(let c=pal.start;c<pal.count;c++){
     let dr=r-colors[c*3],dg=g-colors[c*3+1],db=b-colors[c*3+2];let val=dr*dr*0.3+dg*dg*0.59+db*db*0.11;if(val<dist){dist=val;best=c;}
   }found=best+1;cache[key]=found;}
   indices[pos]=found-1;
 }
 return indices;
}
function lzw(indices){
 const clear=256,end=257;let next=258,bits=9,dict=new Map(),output=[],buf=0,bitPos=0;
 const emit=(code)=>{buf|=code<<bitPos;bitPos+=bits;while(bitPos>=8){output.push(buf&255);buf>>>=8;bitPos-=8;}};
 const reset=()=>{dict=new Map();next=258;bits=9;};
 emit(clear);let prefix=indices[0]??0;
 for(let i=1;i<indices.length;i++){
   const k=indices[i],key=prefix*256+k;let match=dict.get(key);
   if(match!==undefined){prefix=match;continue;}
   emit(prefix);
   if(next<4096){dict.set(key,next++);if(next===(1<<bits)+1&&bits<12)bits++;}
   else{emit(clear);reset();}
   prefix=k;
 }
 emit(prefix);emit(end);if(bitPos>0)output.push(buf&255);
 return Uint8Array.from(output);
}
function encode(frames,w,h,config,onProgress){
 if(!frames.length)throw Error('GIF 프레임이 없습니다.');
 if(w>65535||h>65535)throw Error('GIF 크기 제한 초과');
 const fps=clamp(Number(config.fps)||12,1,50),delay=clamp(Math.round(100/fps),2,65535);
 const options={transparent:!!config.transparent,threshold:clamp(+config.threshold||0,0,255),dither:!!config.dither,bg:config.bg||[0,0,0]};
 const pal=makePalette(frames,options.threshold,options.transparent,options.bg);
 const header=new Uint8Array(13+768);header.set([71,73,70,56,57,97,w&255,(w>>8)&255,h&255,(h>>8)&255,0xf7,0,0]);header.set(pal.palette,13);
 const parts=[header,Uint8Array.from([0x21,0xff,0x0b,78,69,84,83,67,65,80,69,50,46,48,0x03,0x01,0x00,0x00,0x00])];
 let cache=new Uint16Array(32768);
 for(let n=0;n<frames.length;n++){
   const idx=quantize(frames[n],w,h,options,pal,cache);const compressed=lzw(idx);
   const gce=Uint8Array.from([0x21,0xf9,4,options.transparent?0x09:0x08,delay&255,(delay>>8)&255,0,0]);
   const descriptor=Uint8Array.from([0x2c,0,0,0,0,w&255,(w>>8)&255,h&255,(h>>8)&255,0]);
   let blocks=[gce,descriptor,Uint8Array.from([8])];
   for(let i=0;i<compressed.length;i+=255){const part=compressed.subarray(i,i+255);blocks.push(Uint8Array.from([part.length]),part);}
   blocks.push(Uint8Array.from([0]));parts.push(...blocks);
   if(onProgress)onProgress(n+1,frames.length);
 }
 parts.push(Uint8Array.from([0x3b]));return new Blob(parts,{type:'image/gif'});
}
global.GlueGIF={encode,lzw,makePalette};
})(window);
