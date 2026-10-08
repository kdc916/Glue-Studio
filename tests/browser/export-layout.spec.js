const {test,expect}=require('@playwright/test');
for(const width of [1920,1536,1366,1200,1024,800,600,390,320]){
 test('Export Center responsive '+width+'px',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:920});
  await page.goto('/index.html');
  await expect(page.locator('#v17WorkerStatus')).toHaveCount(1);
  const data=await page.evaluate(()=>{
   const byId=id=>document.getElementById(id).getBoundingClientRect();
   const buttons=['exportPng','exportTga','exportGif'].map(byId);
   const status=byId('v17WorkerStatus'),panel=document.querySelector('.export-panel').getBoundingClientRect();
   return {w:buttons.map(b=>b.width),h:buttons.map(b=>b.height),top:buttons.map(b=>b.top),statusY:status.top,maxButtonBottom:Math.max(...buttons.map(b=>b.bottom)),right:buttons.map(b=>b.right),panelRight:panel.right,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  expect(data.horizontalOverflow).toBe(false);
  expect(data.w.every(x=>Math.abs(x-data.w[0])<1)).toBe(true);
  expect(data.h.every(x=>Math.abs(x-data.h[0])<1)).toBe(true);
  if(width>480)expect(data.top.every(x=>Math.abs(x-data.top[0])<1)).toBe(true);
  expect(data.statusY).toBeGreaterThanOrEqual(data.maxButtonBottom-1);
  expect(data.right.every(x=>x<=data.panelRight+2)).toBe(true);
  expect(errors).toEqual([]);
 });
}
