/* maxVFX Glue Studio v1.4 ZIP STORE writer/reader. No CDNs or external libraries. */
(function(root){'use strict';
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const table=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?(c>>>1)^0xedb88320:c>>>1;table[i]=c>>>0;}
function crc32(data){let c=0xffffffff;for(const v of data)c=(c>>>8)^table[(c^v)&255];return(c^0xffffffff)>>>0;}
function dosDate(t=new Date()){const yr=Math.min(2107,Math.max(1980,t.getFullYear()));return [((t.getHours()&31)<<11)|((t.getMinutes()&63)<<5)|((t.getSeconds()/2)&31),((yr-1980)<<9)|((t.getMonth()+1)<<5)|t.getDate()];}
function view(size){const bytes=new Uint8Array(size);return {bytes,dv:new DataView(bytes.buffer)};}
function asBytes(value){if(value instanceof Uint8Array)return value;if(value instanceof ArrayBuffer)return new Uint8Array(value);if(typeof value==='string')return encoder.encode(value);throw Error('ZIP에 지원되지 않는 입력입니다.');}
function nameCheck(s){if(!s||s.startsWith('/')||s.includes('\\')||s.split('/').some(x=>x==='..'||x==='.'||!x)||s.includes('\0'))throw Error('잘못된 ZIP 파일명: '+s);return s;}
function pack(entries){if(!Array.isArray(entries)||!entries.length||entries.length>1024)throw Error('ZIP 항목 수 제한 (1~1024)');
 const seen=new Set(),parts=[],centers=[];let offset=0,centralSize=0;
 const [time,date]=dosDate();
 for(const item of entries){const name=nameCheck(item.name);if(seen.has(name))throw Error('중복 ZIP 파일명 '+name);seen.add(name);
  const nb=encoder.encode(name),data=asBytes(item.data),size=data.length,crc=crc32(data);
  if(nb.length>65535||size>0xffffffff||offset+size>0xffffffff)throw Error('ZIP32 크기 제한 초과');
  const local=view(30+nb.length),v=local.dv;v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(8,0,true);v.setUint16(10,time,true);v.setUint16(12,date,true);v.setUint32(14,crc,true);v.setUint32(18,size,true);v.setUint32(22,size,true);v.setUint16(26,nb.length,true);local.bytes.set(nb,30);parts.push(local.bytes,data);
  const center=view(46+nb.length),c=center.dv;c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(10,0,true);c.setUint16(12,time,true);c.setUint16(14,date,true);c.setUint32(16,crc,true);c.setUint32(20,size,true);c.setUint32(24,size,true);c.setUint16(28,nb.length,true);c.setUint32(42,offset,true);center.bytes.set(nb,46);centers.push(center.bytes);centralSize+=center.bytes.length;offset+=local.bytes.length+size;
 }
 if(offset+centralSize>0xffffffff)throw Error('ZIP32 크기 제한 초과');const end=view(22),e=end.dv;e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
 return new Blob([...parts,...centers,end.bytes],{type:'application/zip'});
}
function unpack(input,limits={}){const b=asBytes(input),v=new DataView(b.buffer,b.byteOffset,b.byteLength),maxBytes=limits.maxBytes||350000000,maxEntries=limits.maxEntries||1024;
 const u16=o=>v.getUint16(o,true),u32=o=>v.getUint32(o,true);let eof=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(u32(i)===0x06054b50&&i+22+u16(i+20)===b.length){eof=i;break;}}
 if(eof<0)throw Error('ZIP 중앙 디렉터리가 없습니다.');const count=u16(eof+10),dirSize=u32(eof+12),offset=u32(eof+16);
 if(count>maxEntries||count!==u16(eof+8)||offset+dirSize>eof||u16(eof+4)||u16(eof+6))throw Error('ZIP 구조나 크기가 지원되지 않습니다.');
 let cursor=offset,total=0;const files=new Map();
 for(let i=0;i<count;i++){if(cursor+46>eof||u32(cursor)!==0x02014b50)throw Error('ZIP 디렉터리가 손상되었습니다.');
  const flags=u16(cursor+8),method=u16(cursor+10),crc=u32(cursor+16),size=u32(cursor+20),nameLen=u16(cursor+28),extra=u16(cursor+30),comment=u16(cursor+32),localOffset=u32(cursor+42);
  if(!(flags&0x800)||method!==0||u32(cursor+24)!==size||(flags&1))throw Error('이 ZIP은 저장형(STORE) 파일만 지원합니다.');
  if(cursor+46+nameLen+extra+comment>eof)throw Error('ZIP 파일명이 잘렸습니다.');
  const name=nameCheck(decoder.decode(b.subarray(cursor+46,cursor+46+nameLen)));
  if(files.has(name)||size>maxBytes||(total+=size)>maxBytes)throw Error('ZIP 크기 또는 중복 파일 제한 초과');
  if(localOffset+30>b.length||u32(localOffset)!==0x04034b50)throw Error('ZIP 로컬 헤더 오류');
  const dataStart=localOffset+30+u16(localOffset+26)+u16(localOffset+28);
  if(dataStart+size>b.length)throw Error('ZIP 데이터가 잘렸습니다.');const data=b.subarray(dataStart,dataStart+size);
  if(crc32(data)!==crc)throw Error('ZIP 파일 CRC 검증 실패: '+name);
  files.set(name,data);cursor+=46+nameLen+extra+comment;
 }
 return files;
}
root.GlueZIP={pack,unpack,crc32};
})(typeof window==='undefined'?globalThis:window);