import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { PDFDocument } from 'pdf-lib';

process.env.VERCEL='1';
const {default:handler}=await import('../api/index.mjs');
let cookie='';
async function request(route,body,options={}){
 const req=Readable.from([]);
 req.url='/api/index?route='+encodeURIComponent(route.split('?')[0])+(route.includes('?')?'&'+route.split('?')[1]:'');
 req.method=body===undefined?'GET':'POST';
 req.body=body;
 req.headers={host:'arctic.example',cookie,origin:'https://arctic.example',...options.headers};
 req.socket={remoteAddress:'127.0.0.1'};
 if(options.query)req.query=options.query;
 const headers={};let status=200,data;
 const res={setHeader:(key,value)=>headers[key.toLowerCase()]=value,writeHead:(code,values={})=>{status=code;for(const [key,value]of Object.entries(values))headers[key.toLowerCase()]=value;},end:value=>{data=Buffer.from(value??'');},headersSent:false};
 await handler(req,res);
 if(headers['set-cookie'])cookie=headers['set-cookie'].split(';')[0];
 return {status,headers,data,json:()=>JSON.parse(data)};
}
let r=await request('bootstrap');assert.equal(r.status,200);assert.equal(r.json().deployment.demo,true);assert.equal(r.json().deployment.maxUploadBytes,3_000_000);
r=await request('login',{email:'participant@arctic.demo',password:'Arctic2026!'});assert.equal(r.status,200);assert.match(r.headers['set-cookie'],/; Secure/);
r=await request('bootstrap');assert.equal(r.json().user.role,'participant');const project=r.json().projects[0];
r=await request('files/'+project.files[0].id);assert.equal(r.status,200);assert.equal(r.data.subarray(0,5).toString(),'%PDF-');
r=await request('document?kind=certificate');assert.equal(r.status,200);assert.equal(r.data.subarray(0,5).toString(),'%PDF-');
r=await request('profile',{name:'Vercel HTTPS test'});assert.equal(r.status,200);
r=await request('bootstrap');assert.equal(r.json().user.profile.name,'Vercel HTTPS test');
r=await request('profile',{name:'Blocked'},{headers:{origin:'https://evil.example'}});assert.equal(r.status,403);
r=await request('profile',{name:'Blocked'},{headers:{origin:'http://arctic.example'}});assert.equal(r.status,403);
const pdf=await PDFDocument.create();pdf.addPage();const bytes=Buffer.from(await pdf.save());
r=await request('upload',{name:'consent.pdf',kind:'consent',data:bytes.toString('base64')});assert.equal(r.status,200);const file=r.json().file;
r=await request('files/'+file.id);assert.equal(r.status,200);assert.deepEqual(r.data,bytes);
r=await request('upload',{name:'large.pdf',kind:'consent',data:Buffer.alloc(3_000_001).toString('base64')});assert.equal(r.status,400);
r=await request('bootstrap',undefined,{query:{route:'bootstrap'}});assert.equal(r.status,200);
const child=spawn(process.execPath,['--input-type=module','-e',`import handler from './api/index.mjs';const req={url:'/api/index?route=bootstrap',method:'GET',headers:{host:'arctic.example',cookie:${JSON.stringify(cookie)}},socket:{}};const res={writeHead:()=>{},end:data=>{const state=JSON.parse(data);if(state.user!==null)process.exit(1);console.log('Fresh instance has clean demo data');}};await handler(req,res);`],{env:{...process.env,VERCEL:'1'},stdio:['ignore','pipe','pipe']});
let log='';child.stdout.on('data',data=>log+=data);child.stderr.on('data',data=>log+=data);const code=await new Promise(resolve=>child.once('exit',resolve));assert.equal(code,0,log);
console.log('PASS Vercel handler: HTTPS, sessions, routing, uploads, private downloads, PDF, CSRF and fresh instance.');
