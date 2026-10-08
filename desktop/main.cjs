'use strict';
const {app,BrowserWindow,Menu,dialog,protocol,shell,session}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path');
const SCHEME='gluestudio',ROOT=path.resolve(__dirname,'..'),URL_HOME='gluestudio://app/index.html';
protocol.registerSchemesAsPrivileged([{scheme:SCHEME,privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};
async function serve(req){
 try {
  const u=new URL(req.url);
  if(u.protocol!=='gluestudio:'||u.hostname!=='app'||u.port||u.username||u.password)throw Error('Bad origin');
  const name=decodeURIComponent(u.pathname);
  if(name.includes('\\')||name.includes('\0'))throw Error('Bad local URL');
  const f=path.resolve(ROOT,'.'+name);
  if(!f.startsWith(ROOT+path.sep))throw Error('Outside app root');
  const ext=path.extname(f).toLowerCase();
  if(!Object.hasOwn(MIME,ext))throw Error('Unsupported resource');
  return new Response(await fs.readFile(f),{headers:{'Content-Type':MIME[ext],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch(error){console.error('[Glue Studio] Resource not found',error);return new Response('Not found',{status:404});}
}
function click(id){
 const w=BrowserWindow.getFocusedWindow();
 if(w&&!w.isDestroyed())w.webContents.executeJavaScript('document.getElementById('+JSON.stringify(id)+')?.click()').catch(console.error);
}
function makeMenu(){return Menu.buildFromTemplate([
 {label:'파일',submenu:[
  {label:'새 프로젝트',accelerator:'Ctrl+N',click:()=>click('btnNewProject')},
  {label:'시퀀스 불러오기',accelerator:'Ctrl+O',click:()=>click('btnImport')},
  {label:'GIF 불러오기',click:()=>click('v14GIFImport')},
  {label:'프로젝트 저장',accelerator:'Ctrl+Shift+S',click:()=>click('v14Save')},
  {type:'separator'},{role:'quit',label:'종료'}
 ]},
 {label:'보기',submenu:[{role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]},
 {label:'도움말',submenu:[
  {label:'사용 방법',click:()=>click('btnHelp')},
  {label:'GitHub',click:()=>shell.openExternal('https://github.com/kdc916/Glue-Studio')}
 ]}
]);}
function createWindow(){
 const win=new BrowserWindow({
  title:'maxVFX Glue Studio',width:1500,height:930,minWidth:1024,minHeight:680,show:false,
  backgroundColor:'#0e131b',icon:path.join(__dirname,'assets','icon.ico'),autoHideMenuBar:true,
  webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false}
 });
 win.once('ready-to-show',()=>win.show());
 win.webContents.on('will-navigate',(event,url)=>{if(url!==URL_HOME)event.preventDefault();});
 win.webContents.setWindowOpenHandler(({url})=>{
  if(/^https:\/\/(github\.com\/kdc916\/Glue-Studio|www\.maxvfxtools\.com\/)/i.test(url))
   shell.openExternal(url).catch(console.error);
  return {action:'deny'};
 });
 win.loadURL(URL_HOME).catch(error=>{
  console.error('[Glue Studio] Cannot launch',error);
  dialog.showErrorBox('Glue Studio 실행 오류','프로그램 파일을 읽지 못했습니다. 재설치해 주세요.');
 });
}
function handleDownloads(){
 session.defaultSession.on('will-download',(_event,item)=>{
  const name=path.basename(item.getFilename()||'GlueStudio_Output.png').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_');
  item.setSaveDialogOptions({title:'maxVFX Glue Studio - 내보내기',defaultPath:path.join(app.getPath('downloads'),name)});
  item.on('done',(_e,status)=>{if(status!=='completed'&&status!=='cancelled')console.error('Export error',status,name);});
 });
}
app.setAppUserModelId('com.maxvfx.gluestudio');
app.whenReady().then(()=>{
 protocol.handle(SCHEME,serve);
 session.defaultSession.setPermissionRequestHandler((_webContents,_perm,done)=>done(false));
 handleDownloads();Menu.setApplicationMenu(makeMenu());createWindow();
 app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
