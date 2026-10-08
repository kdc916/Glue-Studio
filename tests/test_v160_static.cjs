const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),ctx={Uint8Array,Uint8ClampedArray,Uint16Array,Uint32Array,Int16Array,TextEncoder,TextDecoder,Blob,ArrayBuffer,DataView,Date,Math,Error,Map,Set};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of ['gif-codec.js','gif-decoder.js','zip-codec.js','export-codec.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
(async()=>{
 const frames=Array.from({length:6},(_,i)=>{const a=new Uint8ClampedArray(16*16*4);for(let j=0;j<a.length;j+=4){a[j]=i*35;a[j+1]=120;a[j+3]=255;}return a;});
 const gif=ctx.GlueGIF.encode(frames,16,16,{fps:12,threshold:96,transparent:false,dither:false,bg:[0,0,0]});
 const decoded=ctx.GlueGIFDecode.decode(new Uint8Array(await gif.arrayBuffer()));assert.equal(decoded.frames.length,6);
 const png=await ctx.GlueExport.encodePNG(frames[0],16,16),b=new Uint8Array(await png.arrayBuffer());
 assert.deepEqual([...b.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 const zip=ctx.GlueZIP.pack([{name:'project.json',data:'{"ok":true}'},{name:'frames/0000.png',data:b}]);
 const recovered=ctx.GlueZIP.unpack(await zip.arrayBuffer());assert.equal(recovered.get('frames/0000.png').length,b.length);
 const damaged=new Uint8Array(await zip.arrayBuffer());damaged[45]^=1;assert.throws(()=>ctx.GlueZIP.unpack(damaged));
 console.log('PASS: GIF six frames, PNG, ZIP round trip and corruption rejection');
})().catch(e=>{console.error(e);process.exitCode=1});

// Deployment gate: all browser modules must remain standalone JavaScript, never HTML script wrappers.
for(const name of ['app.js','gif-codec.js','vfx-addon.js','v12-addon.js','v13-addon.js','v14-addon.js','v15-addon.js','v16-addon.js','v17-addon.js','v17-worker-source.js']){
 const code=fs.readFileSync(path.join(root,name),'utf8');
 assert(code.length>200,'empty '+name);
 new vm.Script(code,{filename:name});
}
assert(!fs.readFileSync(path.join(root,'app.js'),'utf8').includes('</script><script>'),'stray HTML tag inside app.js');
