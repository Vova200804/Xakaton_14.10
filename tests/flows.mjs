import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { questions } from '../dist/data.js';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const base=process.env.TEST_URL||'http://127.0.0.1:4188';
let testServer=null;
if(!process.env.TEST_URL){const storage=await mkdtemp(path.join(tmpdir(),'arctic-flow-'));testServer=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4188',ARCTIC_STORAGE:storage},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{testServer.stdout.once('data',resolve);testServer.once('error',reject);testServer.once('exit',code=>reject(Error('Test server exited '+code)));});}
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const jump=async(route,selector)=>{await page.goto(base+'/#/'+route);await page.waitForSelector(selector);};
const login=async role=>{const res=await context.request.post(base+'/api/login',{data:{email:role+'@arctic.demo',password:'Arctic2026!'}});assert.ok(res.ok());};
try{
 await jump('register','[data-form="register"]');const email='browser-'+Date.now()+'@example.test';
 await page.locator('[name="email"]').fill(email);await page.locator('[name="password"]').fill('Arctic2026!');await page.locator('[name="repeat"]').fill('Arctic2026!');
 await page.getByRole('button',{name:'Получить код'}).click();await page.waitForSelector('dialog[open]');const text=await page.locator('#dialog-body').innerText();const code=text.match(/\b\d{6}\b/)?.[0];assert.ok(code);await page.keyboard.press('Escape');
 await page.locator('[name="code"]').fill(code);await page.locator('[name="parentConsent"]').check();await page.locator('[name="consent"]').check();await page.getByRole('button',{name:'Зарегистрироваться'}).click();await page.waitForSelector('.dashboard-content');
 await jump('profile','[data-action="edit-profile"]');await page.locator('[data-action="edit-profile"]').first().click();await page.locator('dialog [name="name"]').fill('Анна Проверочная');await page.locator('dialog [name="school"]').fill('Школа тестирования');await page.locator('dialog button:has-text("Сохранить")').click();await page.waitForFunction(()=>!document.querySelector('dialog').open);await page.getByText('Анна Проверочная',{exact:true}).first().waitFor();
 await jump('mentor','[data-form="mentor"]');await page.locator('[name="email"]').fill('teacher@arctic.demo');await page.getByRole('button',{name:'ОТПРАВИТЬ ПРИГЛАШЕНИЕ'}).click();await page.getByText('Ожидает подтверждения',{exact:true}).first().waitFor();
 await jump('test-intro','[data-form="test-start"]');await page.locator('[name="count"]').selectOption('5');await page.getByRole('button',{name:'НАЧАТЬ ТЕСТ'}).click();await page.waitForSelector('[data-form="test-answer"]');
 for(let i=0;i<5;i++){const {attempt}=await(await context.request.get(base+'/api/bootstrap')).json();const q=attempt.bank[i],answer=questions.find(x=>x.q===q.q).correct;await page.locator(`[name="answer"][value="${answer}"]`).check();await page.locator('[data-form="test-answer"] button:not([type])').click();if(i<4)await page.getByRole('heading',{name:`Вопрос ${i+2} из 5`,exact:true}).waitFor();}
 await page.waitForSelector('.result-ring');assert.equal(await page.locator('.result-ring strong').innerText(),'100%');
 await jump('submit','[data-form="project"]');const title='Браузерное исследование '+Date.now();await page.locator('[name="name"]').fill(title);await page.locator('[name="nomination"]').selectOption('Экология');await page.locator('[name="annotation"]').fill('Исследование и наблюдение за морским льдом в Арктике.');
 const pdf=await PDFDocument.create();pdf.addPage();const buffer=Buffer.from(await pdf.save());await page.locator('[data-upload="research"]').setInputFiles({name:'research.pdf',mimeType:'application/pdf',buffer});await page.locator('[data-file-name="research"]').filter({hasText:'research.pdf'}).waitFor();
 await page.getByRole('button',{name:'Подать проект',exact:false}).click();await page.waitForSelector('.project-hero');assert.ok((await page.locator('.project-hero').innerText()).includes(title));
 let {projects:items,user}=await(await context.request.get(base+'/api/bootstrap')).json();const project=items.find(p=>p.name===title);assert.equal(project.status,'На проверке');const uid=user.id;
 await login('teacher');await jump('teacher','[data-action="accept-invite"]');await page.locator('[data-action="accept-invite"]').last().click();await page.waitForSelector('.data-table');
 await login('admin');await jump('distribution','[data-action="admit"]');await page.locator(`[data-action="admit"][data-id="${project.id}"]`).click();await page.waitForTimeout(150);await page.locator(`[data-action="project-details"][data-id="${project.id}"]`).click();await page.locator('[data-action="assign"]').click();await page.locator('dialog [name="expert"]').selectOption('expert');await page.locator('dialog button:has-text("Назначить")').click();await page.waitForFunction(()=>!document.querySelector('dialog').open);
 await login('expert');await jump('evaluation?id='+project.id,'[data-form="evaluation"]');await page.locator('[name="comment"]').fill('Исследование выполнено качественно. Рекомендуется к финалу.');await page.getByRole('button',{name:'Отправить оценку'}).click();await page.getByText('Оценка отправлена: 8.15',{exact:true}).waitFor();
 await login('commission');await jump('ranking','[data-action="publish-results"]');await page.locator('[data-action="publish-results"]').click();await page.getByText('Результаты опубликованы',{exact:true}).waitFor();
 const res=await context.request.post(base+'/api/login',{data:{email,password:'Arctic2026!'}});assert.ok(res.ok());await jump('project-results','.score-table');assert.ok((await page.locator('.score-table').innerText()).includes('8.15'));
 await login('admin');await jump('content','[data-action="edit-content"]');await page.locator('[data-key="content"][data-tab="1"]').click();await page.locator('[data-action="new-content"]').click();await page.locator('dialog [name="title"]').fill('Новость проверки '+uid);await page.locator('dialog [name="text"]').fill('Проверка публикации из CMS');await page.locator('dialog [name="published"]').check();await page.locator('dialog button:has-text("Сохранить")').click();await page.waitForFunction(()=>!document.querySelector('dialog').open);await jump('news','.news-list');assert.ok((await page.locator('#app').innerText()).includes('Новость проверки '+uid));
 assert.deepEqual(errors,[]);console.log('PASS browser flow: real registration and code, profile edit, teacher invite, test 100%, PDF upload, project submit, teacher acceptance, moderation, expert assignment, score 8.15, publication, participant result, CMS news publication.');
}finally{await browser.close();testServer?.kill();}
