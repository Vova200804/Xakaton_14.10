import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import { screens,questions } from '../dist/data.js';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const base=process.env.TEST_URL||'http://127.0.0.1:4187';
let testServer=null;
if(!process.env.TEST_URL){const storage=await mkdtemp(path.join(tmpdir(),'arctic-browser-'));testServer=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4187',ARCTIC_STORAGE:storage},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{testServer.stdout.once('data',resolve);testServer.once('error',reject);testServer.once('exit',code=>reject(Error('Test server exited '+code)));});}
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1536,height:1024},reducedMotion:'reduce'}),page=await context.newPage();
const errors=[],failures=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',res=>{if(res.status()>=400&&!res.url().includes('/api/'))errors.push(res.status()+' '+res.url());});
await mkdir('artifacts/screenshots',{recursive:true});
const needed={dashboard:'participant',profile:'participant',mentor:'participant',security:'participant','test-intro':'participant',test:'participant','test-result':'participant',achievements:'participant',submit:'participant',project:'participant','project-results':'participant',defense:'participant',teacher:'teacher',expert:'expert',evaluation:'expert',ranking:'commission',admin:'admin',content:'admin',settings:'admin',questions:'admin',users:'admin',distribution:'admin',mailing:'admin',analytics:'admin'};
let logged=null;
await page.goto(base);await page.waitForSelector('.home-hero');await page.screenshot({path:'artifacts/screenshots/home-desktop.png'});
for(const s of screens){
 try{
  const role=needed[s.id];if(role&&role!==logged){const res=await context.request.post(base+'/api/login',{data:{email:role+'@arctic.demo',password:'Arctic2026!'}});if(!res.ok())throw Error('Login '+role+' '+await res.text());logged=role;}
  if(s.id==='test')await context.request.post(base+'/api/test-start',{data:{count:15,minutes:20}});
  if(s.id==='test-result'){let {attempt}=await(await context.request.get(base+'/api/bootstrap')).json();if(attempt&&!attempt.finished){for(let i=0;i<attempt.bank.length;i++){const answer=questions.find(q=>q.q===attempt.bank[i].q).correct;await context.request.post(base+'/api/test-answer',{data:{id:attempt.id,index:i,answer:i<13?answer:(answer+1)%4,next:i+1,finish:i===attempt.bank.length-1}});}}}
  await page.goto(base+'/#/'+s.id);await page.waitForFunction(title=>document.title===title&&document.querySelector('#app h1,#app h2'),s.title+' — Арктика');await page.evaluate(()=>document.fonts.ready);await page.evaluate(async()=>{const imgs=[...document.images];imgs.forEach(i=>i.loading='eager');await Promise.all(imgs.map(i=>i.decode().catch(()=>{})));});
  const text=await page.locator('#app').innerText();if(text.includes('Не удалось загрузить страницу')||text.includes('Страница не найдена')||(s.id!=='login'&&text.includes('Вход\nв личный кабинет')))throw Error('Page did not render');
  const broken=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));if(broken.length)throw Error('Broken images '+broken.join(','));
  await page.screenshot({path:`artifacts/screenshots/${String(s.number).padStart(2,'0')}-${s.id}.png`,fullPage:true});
  console.log('PASS screen',s.number,s.id);
 }catch(e){failures.push(s.id+': '+e.message);console.log('FAIL',s.id,e.message);}
}
for(const width of [390,768]){
 await page.setViewportSize({width,height:width===390?844:1024});
 for(const id of ['home','register','profile','test-intro','submit','evaluation','questions','analytics']){
  const role=needed[id];if(role&&role!==logged){await context.request.post(base+'/api/login',{data:{email:role+'@arctic.demo',password:'Arctic2026!'}});logged=role;}
  await page.goto(base+'/#/'+id);await page.waitForFunction(()=>document.querySelector('#app h1,#app h2'));await page.waitForTimeout(100);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);if(overflow)failures.push(`Overflow ${id} at ${width}`);
  await page.screenshot({path:`artifacts/screenshots/${id}-${width}.png`,fullPage:true});
 }
}
await page.setViewportSize({width:1536,height:1024});
await page.goto(base+'/#/contacts');await page.waitForSelector('[data-form="contact"]');await page.locator('[name="name"]').fill('Проверка интерфейса');await page.locator('[name="email"]').fill('qa@example.test');await page.locator('[name="message"]').fill('Сообщение из браузерного теста');await page.getByRole('button',{name:'Отправить сообщение'}).click();await page.waitForSelector('#toast.visible');
await page.goto(base+'/#/archive');await page.waitForSelector('[data-search]');await page.locator('[data-search]').fill('несуществующаяработа');if(await page.locator('[data-item]:visible').count()!==0)failures.push('Archive search failed');
await page.locator('[data-search]').fill('');if(await page.locator('[data-item]:visible').count()!==8)failures.push('Archive reset failed');
await page.goto(base+'/?dev=1#/archive');await page.waitForSelector('[data-action="screens"]');await page.locator('[data-action="screens"]').click();await page.waitForSelector('dialog[open]');if(await page.locator('dialog .screen-map a').count()!==40)failures.push('Screen map must include 40');await page.keyboard.press('Escape');if(await page.locator('dialog[open]').count())failures.push('Escape must close dialog');
await writeFile('artifacts/browser-results.json',JSON.stringify({screens:40,widths:[1536,768,390],errors,failures},null,2));
await browser.close();
testServer?.kill();
if(errors.length||failures.length)throw Error(JSON.stringify({errors,failures},null,2));
console.log('PASS browser: 40 screens, 16 responsive screenshots, contact form, search, modal keyboard.');
