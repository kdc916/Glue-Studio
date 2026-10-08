const {test,expect}=require('@playwright/test');
const path=require('path');
const png=path.resolve(__dirname,'../../examples/Transparent_Sequence/transparent_01.png');
const gif=path.resolve(__dirname,'../../examples/GIF_Sequence/vfx_moving_fire.gif');
const input='input[accept=".gif,image/gif"]';
async function ready(page){await page.goto('/index.html');await page.waitForFunction(()=>!!(window.GlueV14&&window.GlueV15&&document.getElementById('gifImportMode')));}
async function checkCount(page,n){await page.waitForFunction(n=>window.__GlueTest.state.frames.length===n&&!window.__GlueTest.state.busy,n);}
test('New GIF replaces current sprite sequence and resets per-project settings',async({page})=>{
 const pageErrors=[];page.on('pageerror',err=>pageErrors.push(err.message));
 await ready(page);await expect(page.locator('#gifImportMode')).toHaveValue('replace');
 await page.locator('#fileInput').setInputFiles([png,png]);await checkCount(page,2);
 await page.locator('#alphaMode').selectOption('black');await page.locator('#trim').check();await page.locator('#gap').fill('12');
 await page.locator('#pivotX').fill('0.2');await page.locator('#pivotX').dispatchEvent('input');
 const previous=await page.evaluate(()=>__GlueTest.state.frames.map(f=>f.id));
 page.once('dialog',d=>d.accept());await page.locator(input).setInputFiles(gif);await checkCount(page,6);
 const r=await page.evaluate(()=>({ids:__GlueTest.state.frames.map(f=>f.id),selected:__GlueTest.state.selected,alpha:document.getElementById('alphaMode').value,trim:document.getElementById('trim').checked,gap:document.getElementById('gap').value,tileW:+document.getElementById('tileW').value,sourceW:__GlueTest.state.frames[0].bitmap.width,pivot:__GlueV11Test.v11.defaultPivot,timing:__GlueTest.state.frames.map(f=>f.durationMs),history:GlueV15.history.getState()}));
 expect(r.ids.some(id=>previous.includes(id))).toBe(false);expect(r.selected).toBe(0);
 expect(r.alpha).toBe('off');expect(r.gap).toBe('0');expect(r.trim).toBe(false);
 expect(r.tileW).toBe(r.sourceW);expect(r.pivot).toEqual({x:0.5,y:0.5});expect(r.history.undo).toBe(0);
 expect(r.timing.every(ms=>ms>0)).toBe(true);expect(pageErrors).toEqual([]);
});
test('Append is opt-in; cancellation or invalid GIF preserves current frames',async({page})=>{
 await ready(page);await page.locator(input).setInputFiles(gif);await checkCount(page,6);
 const previous=await page.evaluate(()=>__GlueTest.state.frames.map(f=>f.id));
 await page.locator('#gifImportMode').selectOption('append');await page.locator(input).setInputFiles(gif);await checkCount(page,12);
 const ids=await page.evaluate(()=>__GlueTest.state.frames.map(f=>f.id));expect(ids.slice(0,6)).toEqual(previous);
 await page.locator('#gifImportMode').selectOption('replace');
 page.once('dialog',d=>d.dismiss());await page.locator(input).setInputFiles(gif);
 expect(await page.evaluate(()=>__GlueTest.state.frames.map(f=>f.id))).toEqual(ids);
 page.once('dialog',d=>d.accept());await page.locator(input).setInputFiles({name:'broken.gif',mimeType:'image/gif',buffer:Buffer.from('GIF89aBROKEN')});
 await page.waitForTimeout(400);expect(await page.evaluate(()=>__GlueTest.state.frames.map(f=>f.id))).toEqual(ids);
});