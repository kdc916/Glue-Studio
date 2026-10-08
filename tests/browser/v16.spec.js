const {test,expect}=require('@playwright/test'),fs=require('fs');
async function importGeneratedGif(page){
 const bytes=await page.evaluate(async()=>{const w=16,h=16,frames=Array.from({length:6},(_,i)=>{const a=new Uint8ClampedArray(w*h*4);for(let p=0;p<a.length;p+=4){a[p]=i*30;a[p+1]=120;a[p+3]=255;}return a;});const b=GlueGIF.encode(frames,w,h,{fps:12,threshold:96,transparent:false,dither:false,bg:[0,0,0]});return Array.from(new Uint8Array(await b.arrayBuffer()));});
 await page.locator('input[accept=".gif,image/gif"]').setInputFiles({name:'test.gif',mimeType:'image/gif',buffer:Buffer.from(bytes)});
 await page.waitForFunction(()=>window.__GlueTest.state.frames.length===6);
}
test('GIF -> PNG atlas; quality inspector and export worker',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/index.html');await page.waitForFunction(()=>!!(window.GlueV16&&window.GlueV15&&window.GlueV14));await importGeneratedGif(page);
 await page.locator('#v15Check').click();await expect(page.locator('#v15Stats')).toContainText('6프레임');
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#exportPng').click()]);
 expect([...fs.readFileSync(await download.path()).subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);expect(errors).toEqual([]);
});
test('opt-in IndexedDB save, page reload, manual restore, clear',async({page})=>{
 await page.goto('/index.html');await page.waitForFunction(()=>!!(window.GlueV16&&window.GlueV14));await importGeneratedGif(page);
 await page.locator('#v16Enabled').check();await page.locator('#v16Save').click();
 await expect(page.locator('#v16Status')).toContainText('로컬 복구 저장 완료',{timeout:30000});
 expect(await page.evaluate(async()=>(await GlueV16.readSlot()).count)).toBe(6);
 await page.reload();await page.waitForFunction(()=>!!window.GlueV16);
 await expect(page.locator('#v16Restore')).toBeEnabled();
 page.on('dialog',async d=>d.accept());await page.locator('#v16Restore').click();
 await page.waitForFunction(()=>window.__GlueTest.state.frames.length===6);
 await page.locator('#v16Delete').click();await expect(page.locator('#v16Restore')).toBeDisabled();await expect(page.locator('#v16Enabled')).not.toBeChecked();
});


test('file picker opens and PNG plus GIF import, GIF worker export',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/index.html');
 await page.waitForFunction(()=>!!(window.GlueV17&&window.GlueV16&&window.GlueV14));
 const png=require('fs').readFileSync(require('path').resolve(__dirname,'../../examples/Transparent_Sequence/transparent_01.png'));
 const [picker]=await Promise.all([page.waitForEvent('filechooser'),page.locator('#btnImport').click()]);
 await picker.setFiles({name:'sample.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>window.__GlueTest.state.frames.length===1);
 await expect(page.locator('#fileImportStatus')).toContainText('1프레임');
 const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.locator('#v14GIFImport').click()]);
 const array=await page.evaluate(async()=>{const w=2,h=2,frames=Array.from({length:2},(_,i)=>{const a=new Uint8ClampedArray(w*h*4);for(let k=0;k<a.length;k+=4){a[k]=i*200;a[k+3]=255;}return a;});const blob=GlueGIF.encode(frames,w,h,{fps:12,threshold:96,transparent:false,dither:false,bg:[0,0,0]});return Array.from(new Uint8Array(await blob.arrayBuffer()))});
 await chooser.setFiles({name:'sample.gif',mimeType:'image/gif',buffer:Buffer.from(array)});
 await page.waitForFunction(()=>window.__GlueTest.state.frames.length===3);
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#exportGif').click()]);
 expect(download.suggestedFilename()).toMatch(/\.gif$/);
 expect(errors).toEqual([]);
});
