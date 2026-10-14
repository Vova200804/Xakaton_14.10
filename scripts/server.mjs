import http from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './api.mjs';
const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.pdf':'application/pdf','.csv':'text/csv; charset=utf-8','.mp4':'video/mp4','.m4a':'audio/mp4','.mp3':'audio/mpeg','.vtt':'text/vtt; charset=utf-8'};
const server = http.createServer(async (req,res)=>{
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/'))return api(req,res,url);
    const pathname = decodeURIComponent(url.pathname);
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep) && filename !== path.join(root,'index.html')) {res.writeHead(403);res.end();return;}
    const ext=path.extname(filename);
    if(['.mp4','.m4a','.mp3'].includes(ext)){
      const {size}=await stat(filename);let start=0,end=size-1,status=200;
      const headers={'Content-Type':types[ext],'Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
      if(req.headers.range){
        const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if(!range||(!range[1]&&!range[2])){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
        if(range[1]){start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),size-1):size-1;}
        else{const suffix=Number(range[2]);start=Math.max(0,size-suffix);}
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
        status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
      }
      headers['Content-Length']=end-start+1;res.writeHead(status,headers);
      if(req.method==='HEAD'){res.end();return;}
      const stream=createReadStream(filename,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);return;
    }
    const data = await readFile(filename);
    res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Content-Length':data.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
  } catch {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Файл не найден');}
});
server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:' + server.address().port));
