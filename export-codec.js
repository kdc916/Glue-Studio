/* maxVFX Glue Studio · Lossless PNG and uncompressed 32-bit TGA · no dependencies */
(function(global){
'use strict';
const u16=(n)=>[n&255,(n>>>8)&255];
function u32be(n){return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]}
function crcTable(){let t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;}
const table=crcTable();
function crc32(bytes){let c=0xffffffff;for(let i=0;i<bytes.length;i++)c=table[(c^bytes[i])&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function chunk(name,data){let type=new Uint8Array([...name].map(c=>c.charCodeAt(0)));let arr=new Uint8Array(data.length+12);arr.set(u32be(data.length),0);arr.set(type,4);arr.set(data,8);arr.set(u32be(crc32(arr.subarray(4,8+data.length))),8+data.length);return arr;}
function combine(parts){let len=0;for(const p of parts)len+=p.length;let out=new Uint8Array(len),i=0;for(const p of parts){out.set(p,i);i+=p.length;}return out;}
async function encodePNG(rgba,w,h){
  if(rgba.length!==w*h*4)throw Error('PNG RGBA 크기가 올바르지 않습니다.');
  const scan=new Uint8Array(h*(w*4+1));const row=w*4;
  for(let y=0;y<h;y++)scan.set(rgba.subarray(y*row,(y+1)*row),y*(row+1)+1);
  let compressed;
  if(typeof CompressionStream!=='undefined'){
    const stream=new Blob([scan]).stream().pipeThrough(new CompressionStream('deflate'));
    compressed=new Uint8Array(await new Response(stream).arrayBuffer());
  }else{
    // For browsers without CompressionStream, produce zlib stream using deflate stored blocks.
    const parts=[Uint8Array.from([0x78,0x01])];let a=1,b=0;
    for(let start=0;start<scan.length;start+=65535){let size=Math.min(65535,scan.length-start);const tail=start+size>=scan.length?1:0;let block=new Uint8Array(5+size);block.set([tail,size&255,size>>>8,(~size)&255,((~size)>>>8)&255]);block.set(scan.subarray(start,start+size),5);parts.push(block);}
    for(let i=0;i<scan.length;i++){a=(a+scan[i])%65521;b=(b+a)%65521;}parts.push(Uint8Array.from(u32be(((b<<16)|a)>>>0)));compressed=combine(parts);
  }
  const ihdr=Uint8Array.from([...u32be(w),...u32be(h),8,6,0,0,0]);
  return new Blob([Uint8Array.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',compressed),chunk('IEND',new Uint8Array())],{type:'image/png'});
}
function encodeTGA(rgba,w,h){
 if(w>65535||h>65535)throw Error('TGA 최대 해상도는 65535입니다.');
 const out=new Uint8Array(18+rgba.length);out[2]=2;out.set(u16(w),12);out.set(u16(h),14);out[16]=32;out[17]=0x28; // top-origin, eight alpha bits
 for(let i=0;i<rgba.length;i+=4){out[18+i]=rgba[i+2];out[19+i]=rgba[i+1];out[20+i]=rgba[i];out[21+i]=rgba[i+3];}
 return new Blob([out],{type:'image/x-tga'});
}
global.GlueExport={encodePNG,encodeTGA};
})(window);
