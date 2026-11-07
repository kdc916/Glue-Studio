'use strict';
const {app,BrowserWindow,Menu,dialog,protocol,shell,session}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path');
const {safeFileName,usableDirectory,pickAvailablePath,readSavedDirectory,saveDirectory}=require('./save-location.cjs');
let lastExportDirectory=null;
const pendingExportPaths=new Set();
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
function rememberExportDirectory(directory){
 try{lastExportDirectory=saveDirectory(app.getPath('userData'),directory);}
 catch(error){console.error('[Glue Studio] Could not remember output folder:',error);lastExportDirectory=usableDirectory(directory);}
}
async function chooseExportDirectory(){
 const current=BrowserWindow.getFocusedWindow()||BrowserWindow.getAllWindows()[0];
 const options={title:'maxVFX Glue Studio - 저장 폴더 변경',defaultPath:usableDirectory(lastExportDirectory)||app.getPath('downloads'),properties:['openDirectory','createDirectory']};
 const selection=current?await dialog.showOpenDialog(current,options):await dialog.showOpenDialog(options);
 if(!selection.canceled&&selection.filePaths[0])rememberExportDirectory(selection.filePaths[0]);
}
function openExportDirectory(){
 const directory=usableDirectory(lastExportDirectory);
 if(!directory){dialog.showMessageBox({type:'info',title:'저장 폴더',message:'저장된 폴더가 없습니다. 먼저 파일을 저장하거나 저장 폴더를 지정해 주세요.'});return;}
 shell.openPath(directory).then(error=>{if(error)dialog.showErrorBox('폴더 열기 실패',error);}).catch(console.error);
}
function makeMenu(){return Menu.buildFromTemplate([
 {label:'파일',submenu:[
  {label:'새 프로젝트',accelerator:'Ctrl+N',click:()=>click('btnNewProject')},
  {label:'시퀀스 불러오기',accelerator:'Ctrl+O',click:()=>click('btnImport')},
  {label:'GIF 불러오기',click:()=>click('v14GIFImport')},
  {label:'프로젝트 저장',accelerator:'Ctrl+Shift+S',click:()=>click('v14Save')},
  {type:'separator'},
  {label:'저장 폴더 변경…',click:()=>chooseExportDirectory().catch(console.error)},
  {label:'마지막 저장 폴더 열기',click:openExportDirectory},
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
  const name=safeFileName(item.getFilename()||'GlueStudio_Output.png');
  const directory=usableDirectory(lastExportDirectory);
  let assignedPath=null;
  if(directory){
   try{
    assignedPath=pickAvailablePath(directory,name,pendingExportPaths);
    pendingExportPaths.add(assignedPath);
    item.setSavePath(assignedPath);
   }catch(error){
    if(assignedPath)pendingExportPaths.delete(assignedPath);
    assignedPath=null;
    console.error('[Glue Studio] Automatic export path unavailable:',error);
   }
  }
  if(!assignedPath){
   item.setSaveDialogOptions({title:'maxVFX Glue Studio - 첫 저장 위치 선택',defaultPath:path.join(app.getPath('downloads'),name)});
  }
  item.on('done',(_e,status)=>{
   if(assignedPath)pendingExportPaths.delete(assignedPath);
   if(status==='completed'){
    const savedPath=item.getSavePath();
    if(savedPath){
     rememberExportDirectory(path.dirname(savedPath));
     shell.showItemInFolder(savedPath);
    }
   }else if(status!=='cancelled')console.error('[Glue Studio] Export error',status,name);
  });
 });
}
app.setAppUserModelId('com.maxvfx.gluestudio');
app.whenReady().then(()=>{
 lastExportDirectory=readSavedDirectory(app.getPath('userData'));
 protocol.handle(SCHEME,serve);
 session.defaultSession.setPermissionRequestHandler((_webContents,_perm,done)=>done(false));
 handleDownloads();Menu.setApplicationMenu(makeMenu());createWindow();
 app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
