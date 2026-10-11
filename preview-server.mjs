import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {execFile} from 'node:child_process';
const root=dirname(fileURLToPath(import.meta.url));
const allowed=new Map([['/','text/html; charset=utf-8'],['/index.html','text/html; charset=utf-8'],['/preview.css','text/css'],['/preview.js','text/javascript'],['/renderer.js','text/javascript'],['/assets/goku-loop.mp4','video/mp4'],['/assets/poster.jpg','image/jpeg']]);
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  if(!['GET','HEAD'].includes(req.method)||!allowed.has(path)){res.writeHead(404).end();return;}
  const file=join(root,path==='/'?'index.html':path.slice(1)),size=(await stat(file)).size;
  let start=0,end=size-1,status=200;
  if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!m){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}
   start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),size-1):size-1;
   if(start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}status=206;}
  const headers={'Content-Type':allowed.get(path),'Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  if(status===206)headers['Content-Range']=`bytes ${start}-${end}/${size}`;
  res.writeHead(status,headers);if(req.method==='HEAD'){res.end();return;}
  createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
 }catch{if(!res.headersSent)res.writeHead(500);res.end();}
});
server.listen(0,'127.0.0.1',()=>{const url=`http://127.0.0.1:${server.address().port}/`;console.log(`Preview: ${url}\nClose this console to stop the local preview.`);if(!process.argv.includes('--no-open'))execFile('explorer.exe',[url],{windowsHide:true},()=>{});});
process.on('SIGINT',()=>server.close(()=>process.exit()));
