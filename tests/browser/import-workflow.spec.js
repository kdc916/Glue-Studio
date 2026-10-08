const {test,expect}=require('@playwright/test');
async function png(page,seed){return Buffer.from(await page.evaluate(async seed=>{
 const c=document.createElement('canvas');c.width=16;c.height=16;
 const x=c.getContext('2d');x.fillStyle='rgb('+seed+',70,120)';x.fillRect(0,0,16,16);
 return [...new Uint8Array(await(await new Promise(r=>c.toBlob(r))).arrayBuffer())];
},seed));}
async function gif(page){return Buffer.from(await page.evaluate(async()=>{
 const frames=Array.from({length:6},(_,i)=>{const a=new Uint8ClampedArray(16*16*4);for(let j=0;j<a.length;j+=4){a[j]=i*30;a[j+1]=140;a[j+3]=255;}return a;});
 const b=GlueGIF.encode(frames,16,16,{fps:12,threshold:96,transparent:false,dither:false,bg:[0,0,0]});
 return [...new Uint8Array(await b.arrayBuffer())];
}));}
async function ready(page){await page.goto('/index.html');await page.waitForFunction(()=>!!window.GlueV14&&!!window.GlueV15&&document.getElementById('importMode'));}
async function count(page,n){await page.waitForFunction(n=>window.__GlueTest.state.frames.length===n&&!window.__GlueTest.state.busy,n);}
test('batch import replaces GIF and static sequence only once, append opt-in',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 const a=await png(page,40),b=await png(page,130),c=await png(page,225);
 const files=[{name:'001.png',mimeType:'image/png',buffer:a},{name:'002.png',mimeType:'image/png',buffer:b},{name:'003.png',mimeType:'image/png',buffer:c}];
 await page.locator('#fileInput').setInputFiles(files);await count(page,3);
 await expect(page.locator('#importMode')).toHaveValue('replace');
 const g=await gif(page);page.once('dialog',d=>d.accept());
 await page.locator('input[accept=".gif,image/gif"]').setInputFiles({name:'fire.gif',mimeType:'image/gif',buffer:g});await count(page,6);
 page.once('dialog',d=>d.accept());await page.locator('#fileInput').setInputFiles(files);await count(page,3);
 await page.locator('#importMode').selectOption('append');await page.locator('#fileInput').setInputFiles(files);await count(page,6);
 expect(errors).toEqual([]);
});
test('import cancel/error preserves old project, new project offers immediate picker',async({page})=>{
 await ready(page);const p=await png(page,50);
 await page.locator('#fileInput').setInputFiles({name:'one.png',mimeType:'image/png',buffer:p});await count(page,1);
 page.once('dialog',d=>d.dismiss());
 await page.locator('#fileInput').setInputFiles({name:'two.png',mimeType:'image/png',buffer:p});await count(page,1);
 page.once('dialog',d=>d.accept());
 await page.locator('#fileInput').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not a PNG')});
 await page.waitForTimeout(250);expect(await page.evaluate(()=>__GlueTest.state.frames.length)).toBe(1);
 page.once('dialog',d=>d.accept());
 const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.locator('#btnNewProject').click()]);
 expect(await page.evaluate(()=>__GlueTest.state.frames.length)).toBe(0);
 await chooser.setFiles({name:'new.png',mimeType:'image/png',buffer:p});await count(page,1);
});
