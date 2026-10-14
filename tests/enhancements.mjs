import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {PDFDocument} from 'pdf-lib';

const storage=await mkdtemp(path.join(tmpdir(),'arctic-enhancements-')),base='http://127.0.0.1:4194';
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4194',ARCTIC_STORAGE:storage},stdio:['ignore','pipe','pipe']});
let browser;
try {
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const request=async(route,data)=>{const r=await context.request.post(base+'/api/'+route,{data});assert(r.ok(),route+': '+await r.text());return r.json();};
 const login=role=>request('login',{email:role+'@arctic.demo',password:'Arctic2026!'});
 const jump=async id=>{await page.goto(base+'/#/'+id);await page.waitForFunction(id=>document.body.dataset.route===id&&document.querySelector('#main h1,#main h2'),id.split('?')[0]);};
 const menu=()=>page.locator('.sidebar nav').evaluate(e=>[...e.children].map(c=>[c.getAttribute('href'),c.dataset.action,c.textContent]));
 await login('teacher');await jump('teacher');const teacherMenu=await menu();
 for(const id of ['teacher?view=invitations','teacher?view=overview','teacher?view=projects','teacher?view=certificate','documents','teacher']){await jump(id);assert.deepEqual(await menu(),teacherMenu);}
 await page.locator('.sidebar [data-action="account-profile"]').click();await page.locator('dialog [data-action="edit-profile"]').click();assert.equal(await page.locator('dialog [name="grade"],dialog [name="parent"],dialog [name="birth"]').count(),0);await page.locator('dialog [name="position"]').fill('Учитель географии');await page.locator('dialog button').filter({hasText:'Сохранить'}).click();await page.locator('dialog[open]').waitFor({state:'hidden'});
 assert.equal((await (await context.request.get(base+'/api/bootstrap')).json()).user.profile.position,'Учитель географии');
 await jump('teacher?view=certificate');await page.locator('[data-form="teacher-certificate"] button').click();await page.locator('dialog a[href*="teacher-certificate"]').waitFor();const url=await page.locator('dialog a[href*="teacher-certificate"]').getAttribute('href');const pdf=await context.request.get(base+url);assert(pdf.ok());assert.equal((await PDFDocument.load(await pdf.body())).getPageCount(),1);
 const forbidden=await context.request.post(base+'/api/teacher-certificate',{data:{student:'not-my-student',event:'Тест',achievement:'Участие',issued:'2026-10-14'}});assert.equal(forbidden.status(),403);
 await login('expert');assert.equal((await context.request.get(base+url)).status(),403,'Another role cannot download the teacher certificate');await jump('expert');const expertMenu=await menu();await jump('evaluation?id=p0');assert.deepEqual(await menu(),expertMenu);assert.match(await page.locator('[data-evaluation-files]').innerText(),/Презентация\.pdf/);assert.doesNotMatch(await page.locator('[data-evaluation-files]').innerText(),/Исследовательская работа\.pdf/);
 await page.locator('[data-key="evaluation"][data-tab="1"]').click();assert.match(await page.locator('[data-evaluation-files]').innerText(),/Исследовательская работа\.pdf/);assert.doesNotMatch(await page.locator('[data-evaluation-files]').innerText(),/Презентация\.pdf/);
 await page.locator('[data-weight]').first().fill('20');assert.equal(await page.locator('[data-weight]').first().inputValue(),'10');await page.locator('[data-weight]').first().fill('-5');assert.equal(await page.locator('[data-weight]').first().inputValue(),'0');
 await login('admin');await jump('admin');const adminMenu=await menu();for(const id of ['users','mailing','analytics','settings','content','questions','distribution']){await jump(id);assert.deepEqual(await menu(),adminMenu);}
 await jump('questions');await page.locator('[data-action="new-question"]').click();await page.locator('dialog [name="type"]').selectOption({label:'Несколько правильных ответов'});assert.equal(await page.locator('dialog input[name="correct"][type="checkbox"]').count(),4);await page.keyboard.press('Escape');
 let data=await (await context.request.get(base+'/api/bootstrap')).json();for(const q of data.questions)await request('admin-save',{kind:'questions',id:q.id,data:{...q,published:false}});
 for(let i=0;i<5;i++)await request('admin-save',{kind:'questions',data:{q:'Два правильных варианта '+i,a:['Да','Нет','Да тоже','Не подходит'],topic:i<3?'Природа Арктики':'Научные исследования',type:'multiple',correctAnswers:[0,2],correct:0,published:true,difficulty:'Средний'}});
 await jump('analytics');const regions=await page.locator('[data-analytics-panel]').innerText();await page.locator('[data-key="analytics"][data-tab="2"]').click();assert.notEqual(await page.locator('[data-analytics-panel]').innerText(),regions);assert.match(await page.locator('[data-analytics-panel]').innerText(),/Темы банка вопросов/);await page.locator('[name="from"]').fill('2099-01-01');await page.locator('[data-key="analytics"][data-tab="4"]').click();assert.match(await page.locator('[data-analytics-panel]').innerText(),/данных нет/);
 await login('participant');let attempt=(await request('test-start',{count:5,minutes:10})).attempt;assert(attempt.bank.every(q=>!('correct' in q)&&!('correctAnswers' in q)),'Answers must never leak');await jump('test');assert.equal(await page.locator('input[name="answer"][type="checkbox"]').count(),4);assert.match(await page.locator('#main').innerText(),/несколько правильных ответов/);
 const bad=await context.request.post(base+'/api/test-answer',{data:{id:attempt.id,index:0,answer:[0,0],next:1}});assert.equal(bad.status(),400);
 for(let i=0;i<5;i++)attempt=(await request('test-answer',{id:attempt.id,index:i,answer:i===0?[0]:[2,0],next:i+1,finish:i===4})).attempt;
 assert.equal(attempt.right,4);assert.equal(attempt.percent,80,'Partial multi-answer is not correct, order of complete set does not matter');
 await jump('media');assert.equal(await page.locator('.media-item:visible').count(),6);await page.locator('[data-key="media"][data-tab="1"]').click();assert.equal(await page.locator('.media-item:visible').count(),2);const first=await page.locator('.media-item:visible').first().boundingBox(),grid=await page.locator('.media-grid').boundingBox();assert(Math.abs(first.x-grid.x)<2,'Filtered cards start from first column');await page.locator('[data-filter="0"]').selectOption('2025');assert.equal(await page.locator('.media-item:visible').count(),1);await page.locator('[data-key="media"][data-tab="0"]').click();assert.equal(await page.locator('.media-item:visible').count(),2,'Year and kind combine');
 const articles=[];for(let i=0;i<7;i++){await jump('bear?topic='+i);articles.push(await page.locator('.article-text').innerText());assert.equal(await page.locator('.article-text a[target="_blank"]').count(),1);}assert.equal(new Set(articles).size,7);assert.doesNotMatch(articles[2],/Норвег/);
 await login('admin');await jump('settings?tab=3');assert(await page.locator('[data-form="general-settings"]').isVisible());await page.locator('[data-key="settings"][data-tab="0"]').click();assert(await page.locator('[data-form="settings"]').isVisible());
 for(const width of [390,768]){await page.setViewportSize({width,height:844});await jump('users');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.locator('.sidebar a[href="#/admin"]').click();await page.waitForFunction(()=>document.body.dataset.route==='admin');}
 await page.setViewportSize({width:1440,height:960});await jump('analytics');await mkdir('artifacts/screenshots',{recursive:true});await page.screenshot({path:'artifacts/screenshots/enhancements-analytics.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('PASS enhancements: stable role menus, adult profiles, teacher certificates and ownership, per-kind files, score bounds, multiple answers without leaks, analytics periods, gallery reflow, seven articles and mobile return navigation.');
}finally{await browser?.close();server.kill();}
