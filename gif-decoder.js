/* maxVFX Glue Studio v1.4 — animated GIF89a/87a decoder (LZW, GCE, disposal, transparency, interlace). */
(function(root){'use strict';
function decode(input, opts={}){
 const b=input instanceof Uint8Array?input:new Uint8Array(input), maxFrames=opts.maxFrames||512, maxPixels=opts.maxPixels||32000000;
 let p=0;
 function need(n){if(p+n>b.length)throw Error('손상되었거나 잘린 GIF 데이터입니다.');}
 function u8(){need(1);return b[p++];}
 function u16(){let lo=u8();return lo|(u8()<<8);}
 function read(n){need(n);const v=b.subarray(p,p+n);p+=n;return v;}
 function skipBlocks(){while(true){const n=u8();if(!n)break;read(n);}}
 function blocks(){const parts=[];let size=0;while(true){const n=u8();if(!n)break;parts.push(read(n));size+=n;if(size>100000000)throw Error('GIF 압축 데이터가 너무 큽니다.');}const out=new Uint8Array(size);let k=0;for(const part of parts){out.set(part,k);k+=part.length;}return out;}
 const head=String.fromCharCode(...read(6));if(head!=='GIF89a'&&head!=='GIF87a')throw Error('GIF87a/GIF89a 형식이 아닙니다.');
 const w=u16(),h=u16(),flags=u8(),backgroundIndex=u8();u8();
 if(!w||!h||w>4096||h>4096||w*h>maxPixels)throw Error('GIF 해상도 제한을 초과했습니다.');
 function palette(n){return read(n*3);}
 const globalPalette=(flags&128)?palette(1<<((flags&7)+1)):null;
 const result=[],canvas=new Uint8ClampedArray(w*h*4);
 let gfx={delayMs:100,transparentIndex:-1,disposal:0},previous=null,loopCount=0,total=0;
 function clearRect(left,top,ww,hh,transparent){const pal=globalPalette,color=pal&&backgroundIndex*3+2<pal.length?[pal[backgroundIndex*3],pal[backgroundIndex*3+1],pal[backgroundIndex*3+2]]:[0,0,0];
  for(let y=Math.max(0,top);y<Math.min(h,top+hh);y++)for(let x=Math.max(0,left);x<Math.min(w,left+ww);x++){
   const off=(y*w+x)*4;canvas[off]=transparent?0:color[0];canvas[off+1]=transparent?0:color[1];canvas[off+2]=transparent?0:color[2];canvas[off+3]=transparent?0:255;
  }
 }
 function unpackLZW(bytes,minSize,expected){if(minSize<2||minSize>8)throw Error('지원하지 않는 GIF LZW 크기입니다.');
  const clear=1<<minSize,end=clear+1,prefix=new Int16Array(4096),suffix=new Uint8Array(4096),stack=new Uint8Array(4097),output=new Uint8Array(expected);
  let size=minSize+1,mask=(1<<size)-1,next=end+1,bit=0,old=-1,first=0,len=0;
  function code(){if(bit+size>bytes.length*8)return -1;const idx=bit>>3;let raw=bytes[idx]|((bytes[idx+1]||0)<<8)|((bytes[idx+2]||0)<<16);raw>>=bit&7;bit+=size;return raw&mask;}
  while(len<expected){let c=code();if(c<0)break;if(c===clear){size=minSize+1;mask=(1<<size)-1;next=end+1;old=-1;continue;}if(c===end)break;
   const curr=c;let count=0;
   if(c>=next){if(old<0||c!==next)throw Error('GIF LZW 데이터가 올바르지 않습니다.');stack[count++]=first;c=old;}
   while(c>=clear){if(c>=next||count>=4096)throw Error('GIF 압축 사전이 손상되었습니다.');stack[count++]=suffix[c];c=prefix[c];}
   first=c;stack[count++]=c;
   while(count){if(len>=expected)break;output[len++]=stack[--count];}
   if(old!==-1&&next<4096){prefix[next]=old;suffix[next]=first;next++;if(next===(1<<size)&&size<12){size++;mask=(1<<size)-1;}}
   old=curr;
  }
  if(len!==expected)throw Error('GIF 이미지 압축 데이터가 부족합니다.');return output;
 }
 let nblocks=0;
 while(p<b.length){if(++nblocks>100000)throw Error('GIF 블록이 비정상적으로 많습니다.');const type=u8();if(type===0x3b)break;
  if(type===0x21){const label=u8();if(label===0xf9){const length=u8();if(length!==4)throw Error('GIF 그래픽 제어 블록 오류');const packed=u8(),centis=u16(),transparent=u8();if(u8()!==0)throw Error('GIF GCE 종단자 오류');gfx={delayMs:centis?Math.max(20,centis*10):100,transparentIndex:(packed&1)?transparent:-1,disposal:(packed>>2)&7};}
   else if(label===0xff){const app=String.fromCharCode(...read(u8()));const data=blocks();if(app.startsWith('NETSCAPE')&&data.length>=3&&data[0]===1)loopCount=data[1]|data[2]<<8;}
   else skipBlocks();continue;
  }
  if(type!==0x2c)throw Error('알 수 없는 GIF 데이터 블록입니다: '+type);
  if(previous){if(previous.disposal===2)clearRect(previous.left,previous.top,previous.w,previous.h,previous.clearToTransparent);else if(previous.disposal===3&&previous.before)canvas.set(previous.before);previous=null;}
  const left=u16(),top=u16(),fw=u16(),fh=u16(),desc=u8();
  if(!fw||!fh||fw*fh>maxPixels)throw Error('GIF 프레임 크기가 올바르지 않습니다.');
  const pal=(desc&128)?palette(1<<((desc&7)+1)):globalPalette;if(!pal)throw Error('GIF 색상 팔레트가 없습니다.');
  const interlaced=!!(desc&64),minimum=u8(),compressed=blocks(),indices=unpackLZW(compressed,minimum,fw*fh);
  if(result.length>=maxFrames||total+w*h>maxPixels)throw Error('GIF 프레임 수 또는 총 픽셀 제한을 초과했습니다.');
  const before=gfx.disposal===3?canvas.slice():null;
  let pos=0;
  function drawRow(y){for(let x=0;x<fw;x++){const index=indices[pos++];if(index===gfx.transparentIndex)continue;
    const xx=left+x,yy=top+y,ci=index*3;if(xx<0||xx>=w||yy<0||yy>=h||ci+2>=pal.length)continue;
    const o=(yy*w+xx)*4;canvas[o]=pal[ci];canvas[o+1]=pal[ci+1];canvas[o+2]=pal[ci+2];canvas[o+3]=255;
  }}
  if(interlaced){for(const [start,step] of [[0,8],[4,8],[2,4],[1,2]])for(let y=start;y<fh;y+=step)drawRow(y);}else for(let y=0;y<fh;y++)drawRow(y);
  result.push({rgba:canvas.slice(),durationMs:gfx.delayMs});total+=w*h;
  previous={left,top,w:fw,h:fh,before,disposal:gfx.disposal,clearToTransparent:gfx.transparentIndex===backgroundIndex};
  gfx={delayMs:100,transparentIndex:-1,disposal:0};
 }
 if(!result.length)throw Error('GIF에 이미지 프레임이 없습니다.');
 return {width:w,height:h,frames:result,loopCount};
}
root.GlueGIFDecode={decode};
})(typeof window==='undefined'?globalThis:window);