export function isMain(t){try{const u=new URL(t.url),route=u.searchParams.get('initialRoute')||'';return t.type==='page'&&u.protocol==='app:'&&u.hostname==='-'&&u.pathname==='/index.html'&&!/mini|detached|avatar|popover|notification|dictation|prewarm|\/space\//i.test(route);}catch{return false;}}
export function selectMain(targets){return targets.find(isMain);}
export async function session(endpoint,port){
 const u=new URL(endpoint);if(u.protocol!=='ws:'||u.hostname!=='127.0.0.1'||Number(u.port)!==port||u.username||u.password||!u.pathname.startsWith('/devtools/page/'))throw Error('Unexpected debugging endpoint');
 const ws=new WebSocket(u.href),pending=new Map();let sequence=0;
 await new Promise((ok,fail)=>{const timer=setTimeout(()=>{ws.close();fail(Error('Connection timed out'));},5000);ws.onopen=()=>{clearTimeout(timer);ok();};ws.onerror=()=>{clearTimeout(timer);fail(Error('Connection failed'));};});
 ws.onmessage=e=>{let message;try{message=JSON.parse(e.data);}catch{return;}const p=pending.get(message.id);if(!p)return;pending.delete(message.id);clearTimeout(p.timer);message.error?p.fail(Error(message.error.message)):p.ok(message.result);};
 ws.onclose=()=>{for(const p of pending.values()){clearTimeout(p.timer);p.fail(Error('Connection closed'));}pending.clear();};
 return {request(method,params={},ms=20000){return new Promise((ok,fail)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);fail(Error(method+' timed out'));},ms);pending.set(id,{ok,fail,timer});ws.send(JSON.stringify({id,method,params}));});},close(){ws.close();}};
}
