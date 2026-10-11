import {readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID,randomBytes} from 'node:crypto';
import {createServer} from 'node:http';
import {setTimeout as delay} from 'node:timers/promises';
import {isMain,session} from './cdp.mjs';
const root=dirname(fileURLToPath(import.meta.url)),run=promisify(execFile),argv=process.argv.slice(2);
const stateFile=resolve(argv.find(x=>x.startsWith('--state='))?.slice(8)||join(root,'session.json'));
const port=Number(argv[0]),pid=Number(argv[1]),exe=argv[2];
function validPort(v){return Number.isInteger(v)&&v>=1024&&v<=65535;}
if(argv.includes('--restore')){
 const state=JSON.parse((await readFile(stateFile,'utf8')).replace(/^\uFEFF/,''));
 if(state.schema!==2||!validPort(state.controlPort)||typeof state.token!=='string')throw Error('No active v2 controller session');
 const r=await fetch(`http://127.0.0.1:${state.controlPort}/restore`,{method:'POST',headers:{'X-Goku-Token':state.token},signal:AbortSignal.timeout(30000),redirect:'error'});
 if(!r.ok)throw Error('Restore failed');console.log(await r.text());process.exit(0);
}
if(!validPort(port)||!Number.isInteger(pid)||pid<1||!exe)throw Error('Invalid launch state');
const source=await readFile(join(root,'renderer.js'),'utf8'),videoBase64=(await readFile(join(root,'assets/goku-loop.mp4'))).toString('base64');
const id=randomUUID(),token=randomBytes(24).toString('hex'),clients=new Map(),seenWindows=new Set();let stopping=false,stopPromise,server,installedOnce=false,lastVerified=0;
const config={sessionId:id,managed:true,intro:false,videoBase64,title:'Chat GPT'};
const makeBootstrap=intro=>`(()=>{if(location.protocol!=='app:'||location.hostname!=='-'||location.pathname!=='/index.html'||window.top!==window)return;if((window.__gokuBootstrapLoading&&window.__gokuBootstrapSession===${JSON.stringify(id)})||window.__gokuStartup?.sessionId===${JSON.stringify(id)}||(window.__gokuWallpaperDisabled&&window.__gokuWallpaperSessionId===${JSON.stringify(id)}))return;window.__gokuBootstrapSession=${JSON.stringify(id)};window.__gokuBootstrapLoading=true;(async()=>{if(!document.body)await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));if(document.hidden)await new Promise(r=>{const f=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',f);r();}};document.addEventListener('visibilitychange',f);});if(window.__gokuBootstrapSession!==${JSON.stringify(id)}||(window.__gokuWallpaperDisabled&&window.__gokuWallpaperSessionId===${JSON.stringify(id)}))return;${source}\n await installGokuStartup(${JSON.stringify({...config,intro})});})().catch(e=>{if(window.__gokuBootstrapSession===${JSON.stringify(id)}){window.__gokuBootstrapError=String(e);window.__gokuWallpaperDisabled=true;window.__gokuWallpaperSessionId=${JSON.stringify(id)};}}).finally(()=>{if(window.__gokuBootstrapSession===${JSON.stringify(id)})window.__gokuBootstrapLoading=false;});})()`;
const bootstrap=makeBootstrap(false),initialBootstrap=makeBootstrap(true);
async function verify(){await run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',join(root,'Verify-Port.ps1'),'-Port',String(port),'-AppPid',String(pid),'-ExpectedPath',exe],{windowsHide:true,timeout:8000});lastVerified=Date.now();}
async function evaluate(c,expression,awaitPromise=false){const r=await c.request('Runtime.evaluate',{expression,returnByValue:true,awaitPromise},20000);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||'Evaluation failed');return r.result?.value;}
async function stop(reason='restore'){
 if(stopPromise)return stopPromise;stopping=true;
 stopPromise=(async()=>{console.log('STOP',reason);await Promise.allSettled([...clients.values()].map(async e=>{try{await evaluate(e.c,'window.__gokuBootstrapSession=null;window.__gokuWallpaperDisabled=true;window.__gokuStartup?.dispose("controller");');if(e.script)await e.c.request('Page.removeScriptToEvaluateOnNewDocument',{identifier:e.script});}finally{e.c.close();}}));clients.clear();try{const s=JSON.parse(await readFile(stateFile,'utf8'));if(s.sessionId===id)await unlink(stateFile);}catch{}server?.close();})();return stopPromise;
}
async function main(){
 for(let attempt=0;;attempt++){try{await verify();break;}catch(e){if(attempt>=14)throw e;await delay(1000);}}
 // A second helper must not silently overwrite the active restore endpoint.
 try{const prior=JSON.parse((await readFile(stateFile,'utf8')).replace(/^\uFEFF/,''));if(prior.schema===2&&validPort(prior.controlPort)){try{const r=await fetch(`http://127.0.0.1:${prior.controlPort}/restore`,{method:'POST',headers:{'X-Goku-Token':prior.token},signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Existing controller refused restore');}catch(e){try{process.kill(prior.controllerPid,0);throw Error('An existing controller is running; restore it before starting again');}catch(check){if(check.code!=='ESRCH')throw check;}}}}catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e;}
 server=createServer(async(req,res)=>{if(req.method!=='POST'||req.url!=='/restore'||req.headers['x-goku-token']!==token){res.writeHead(403).end();return;}await stop('restore command');res.writeHead(200,{'Content-Type':'text/plain'}).end('RESTORED');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const state={schema:2,sessionId:id,port,pid,exe,controllerPid:process.pid,controlPort:server.address().port,token,created:new Date().toISOString(),coldIntroSupported:false,startupMode:"after-open-full-window"};
 await writeFile(stateFile+'.tmp',JSON.stringify(state,null,2));await rename(stateFile+'.tmp',stateFile);
 console.log(JSON.stringify({controller:'ready',pid,port,coldIntroSupported:false}));
 const initialDeadline=Date.now()+60000;
 while(!stopping){
  try{process.kill(pid,0);}catch{await stop('application exited');break;}
  if(Date.now()-lastVerified>30000)await verify();
  const response=await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(2500),redirect:'error'});if(!response.ok)throw Error('Debugging endpoint unavailable');
  const targets=(await response.json()).filter(isMain),ids=new Set(targets.map(t=>t.id));
  for(const [key,e]of clients)if(!ids.has(key)){e.c.close();clients.delete(key);}
  for(const target of targets){if(stopping)break;let entry=clients.get(target.id);
   try{
    if(!entry){const c=await session(target.webSocketDebuggerUrl,port);entry={c,script:null};clients.set(target.id,entry);await c.request('Page.enable');entry.script=(await c.request('Page.addScriptToEvaluateOnNewDocument',{source:bootstrap})).identifier;}
    const s=await evaluate(entry.c,`window.__gokuStartup?.heartbeat?.();({disabled:!!window.__gokuWallpaperDisabled&&window.__gokuWallpaperSessionId===${JSON.stringify(id)},loading:!!window.__gokuBootstrapLoading&&window.__gokuBootstrapSession===${JSON.stringify(id)},error:window.__gokuBootstrapError,status:window.__gokuStartup?.sessionId===${JSON.stringify(id)}?window.__gokuStartup.status():null,visible:!document.hidden})`);
    if(s.disabled){await stop(s.error||'restore button');break;}
    if(s.status?.version===2){if(s.status.ready&&s.status.phase!=='loading'){if(!installedOnce)console.log('INSTALLED',JSON.stringify(s.status));installedOnce=true;}}
    else if(!s.loading&&s.visible){await evaluate(entry.c,seenWindows.has(target.id)?bootstrap:initialBootstrap);seenWindows.add(target.id);}
   }catch(e){if(stopping)break;if(/Execution context|execution context|Cannot find context|navigated|Connection closed/.test(e.message)){if(/Connection closed/.test(e.message)){entry?.c.close();clients.delete(target.id);}continue;}console.error('Window connection:',e.message);if(entry){try{await evaluate(entry.c,'window.__gokuBootstrapSession=null;window.__gokuBootstrapSession=null;window.__gokuWallpaperDisabled=true;window.__gokuStartup?.dispose("controller")');if(entry.script)await entry.c.request('Page.removeScriptToEvaluateOnNewDocument',{identifier:entry.script});}catch{}entry.c.close();clients.delete(target.id);}throw e;}
  }
  if(!installedOnce&&Date.now()>initialDeadline)throw Error('No visible supported main window became ready');
  if(!stopping)await delay(1000);
 }
}
process.on('SIGINT',()=>void stop('controller interrupted'));process.on('SIGTERM',()=>void stop('controller stopped'));
main().catch(async e=>{console.error(e.message);await stop('failure');process.exitCode=1;});
