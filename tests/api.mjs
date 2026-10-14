import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { PDFDocument } from 'pdf-lib';
import { questions } from '../dist/data.js';
const storage=await mkdtemp(path.join(tmpdir(),'arctic-api-'));
const legacyDB=new DatabaseSync(path.join(storage,'arctic.sqlite'));legacyDB.exec('CREATE TABLE records(kind TEXT,id TEXT PRIMARY KEY,owner TEXT,data TEXT)');legacyDB.prepare('INSERT INTO records(kind,id,owner,data) VALUES(?,?,?,?)').run('pages','legacy','admin',JSON.stringify({title:'Проверка миграции',route:'legacy',published:true,text:''}));legacyDB.close();
const base='http://127.0.0.1:4186';
let server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4186',ARCTIC_STORAGE:storage},stdio:['ignore','pipe','pipe']});
let log='';server.stderr.on('data',x=>log+=x);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let i=0;i<60;i++){try{if((await fetch(base)).ok)return;}catch{}await delay(100);}throw Error('Server failed: '+log);}
let cookie='';
async function req(url,body,expected=200){const r=await fetch(base+'/api/'+url,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;}
async function login(role){await req('login',{email:role+'@arctic.demo',password:'Arctic2026!'});}
try{
await ready();assert.ok((await req('bootstrap')).pages.some(p=>p.id==='legacy'),'Migration preserves existing records');
await req('profile',{name:'Нельзя'},401);await req('login',{email:'participant@arctic.demo',password:'wrong'},400);
const email='qa-'+Date.now()+'@example.test', {code}=await req('register-code',{email});
await req('register',{email,password:'Arctic2026!',role:'participant',code,consent:true,parentConsent:false},400);
await req('register',{email,password:'Arctic2026!',role:'admin',code,consent:true,parentConsent:true},201);
let state=await req('bootstrap');assert.equal(state.user.role,'participant','Public registration must not grant admin');const owner=state.user.id;
await req('profile',{name:'Тестовый Участник',school:'Школа №1',region:'Мурманская область'});
state=await req('bootstrap');assert.equal(state.user.profile.name,'Тестовый Участник');
await req('test-start',{count:0,minutes:20},400);
let {attempt}=await req('test-start',{count:5,minutes:20});assert.equal(attempt.bank.length,5);assert.equal(new Set(attempt.bank.map(q=>q.q)).size,5);assert.ok(attempt.bank.every(q=>!('correct' in q)),'Do not expose answers');const deadline=attempt.deadline;
for(let i=0;i<attempt.bank.length;i++){const answer=questions.find(q=>q.q===attempt.bank[i].q).correct;({attempt}=await req('test-answer',{id:attempt.id,index:i,answer,next:i+1,finish:i===attempt.bank.length-1}));}
assert.equal(attempt.percent,100);assert.equal(attempt.deadline,deadline);assert.ok(attempt.finished);
const finished=await req('test-answer',{id:attempt.id,index:0,answer:0,finish:true});assert.equal(finished.attempt.percent,100,'Completion is idempotent');
const cert=await fetch(base+'/api/document?kind=certificate',{headers:{Cookie:cookie}});assert.equal(cert.status,200);const certBuffer=Buffer.from(await cert.arrayBuffer());assert.ok(certBuffer.toString().startsWith('%PDF-'));
const info=await req('certificate-info?id='+attempt.id);assert.equal(info.percent,100);assert.ok(!info.email&&!info.phone);const qr=await fetch(base+'/api/qr?id='+attempt.id);assert.equal(qr.status,200);assert.equal(Buffer.from(await qr.arrayBuffer()).subarray(0,4).toString('hex'),'89504e47');
await req('project',{name:'Проект',nomination:'Экология',annotation:'Аннотация',video:'javascript:alert(1)',submit:true},400);
let {project}=await req('project',{name:'Новый исследовательский проект',nomination:'Экология',annotation:'Наблюдения морского льда',submit:false});
await req('upload',{name:'bad.pdf',data:Buffer.from('not a PDF').toString('base64'),project:project.id,kind:'research'},400);
await req('upload',{name:'broken.pdf',data:Buffer.from('%PDF-1.4\nBroken\n%%EOF').toString('base64'),kind:'research',project:project.id},400);const fixturePDF=await PDFDocument.create();fixturePDF.addPage();const pdf=Buffer.from(await fixturePDF.save());const {file}=await req('upload',{name:'Исследование.pdf',data:pdf.toString('base64'),project:project.id,kind:'research'});
const {file:consentFile}=await req('upload',{name:'Согласие.pdf',data:pdf.toString('base64'),kind:'consent'});
const consentDownload=await fetch(base+'/api/files/'+consentFile.id,{headers:{Cookie:cookie}});assert.equal(consentDownload.status,200,'Consent metadata must not overwrite its file record');state=await req('bootstrap');assert.ok(state.consents.some(c=>c.file===consentFile.id));
await req('project',{id:project.id,name:project.name,nomination:'Экология',annotation:'Наблюдения морского льда',submit:true});
await req('mentor',{email:'teacher@arctic.demo'});
await login('teacher');state=await req('bootstrap');const invite=state.mentors.find(m=>m.owner===owner);assert.ok(invite);await req('mentor-answer',{id:invite.id,accept:true});state=await req('bootstrap');assert.ok(state.users.some(u=>u.id===owner));
await login('expert');await req('admin-project',{id:project.id,action:'admit'},403);await req('evaluation',{project:project.id,scores:[9,8,7,8,9],comment:'Тест',submit:true},403);const denied=await fetch(base+'/api/files/'+file.id,{headers:{Cookie:cookie}});assert.equal(denied.status,403);
await login('admin');await req('admin-project',{id:project.id,action:'admit'});await req('admin-project',{id:project.id,action:'assign',expert:'expert'});
await login('expert');await req('evaluation',{project:project.id,scores:[11,8,7,8,9],submit:true},400);const result=await req('evaluation',{project:project.id,scores:[9,8,7,8,9],comment:'Работа выполнена качественно',submit:true});assert.ok(Math.abs(result.score-8.15)<1e-9);
await login('commission');await req('admin-project',{id:project.id,action:'publish'});
await req('login',{email,password:'Arctic2026!'});state=await req('bootstrap');project=state.projects.find(p=>p.id===project.id);assert.equal(project.published,true);assert.ok(project.reviews.length);
await login('admin');state=await req('bootstrap');await req('admin-save',{kind:'config',data:{...state.config,criteria:[['X',90]]}},400);
await req('admin-save',{kind:'questions',data:{q:'Ошибка',a:['Да','Нет'],correct:4,published:true}},400);
await req('admin-save',{kind:'news',data:{title:'Проверка CMS',text:'Текст',category:'Новости',image:'ship',published:true}});
await req('admin-page',{id:'contest',title:'Страница с совпадающим ID',route:'contest',text:'Текст',published:true});assert.ok((await req('bootstrap')).config.criteria.length,'IDs are independent between collections');
const csv=await fetch(base+'/api/report?format=csv',{headers:{Cookie:cookie}});assert.equal(csv.status,200);assert.ok((await csv.text()).includes(project.name));
const xlsx=await fetch(base+'/api/report?format=xlsx',{headers:{Cookie:cookie}});assert.equal(xlsx.status,200);assert.equal(Buffer.from(await xlsx.arrayBuffer()).subarray(0,2).toString(),'PK');
await req('admin-user',{id:'admin',blocked:true},400);
const csrf=await fetch(base+'/api/profile',{method:'POST',headers:{Cookie:cookie,Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'});assert.equal(csrf.status,403);
const traversal=await fetch(base+'/%2e%2e%2fscripts%2fapi.mjs');assert.notEqual(traversal.status,200);
await req('logout',{});await req('profile',{name:'Нет доступа'},401);
server.kill();await new Promise(r=>server.once('exit',r));server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4186',ARCTIC_STORAGE:storage},stdio:['ignore','pipe','pipe']});server.stderr.on('data',x=>log+=x);await ready();await req('login',{email,password:'Arctic2026!'});state=await req('bootstrap');assert.equal(state.user.profile.name,'Тестовый Участник');assert.ok(state.projects.some(p=>p.id===project.id&&p.published));
console.log('PASS API: registration, consent, role enforcement, profile, immutable test, PDF, uploads, private files, mentor, moderation, scoring 8.15, publication, CMS, CSV/XLSX, CSRF, logout, server restart.');
}finally{server.kill();}
