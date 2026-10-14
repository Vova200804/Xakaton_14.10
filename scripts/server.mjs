import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './api.mjs';
const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.pdf':'application/pdf','.csv':'text/csv; charset=utf-8'};
const server = http.createServer(async (req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/'))return api(req,res,url);
    const pathname = decodeURIComponent(url.pathname);
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep) && filename !== path.join(root,'index.html')) {res.writeHead(403);res.end();return;}
    const data = await readFile(filename);
    res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(data);
  } catch {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Файл не найден');}
});
server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:' + server.address().port));
