import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {PDFDocument} from 'pdf-lib';

const storage=await mkdtemp(path.join(tmpdir(),'arctic-feedback-'));
const base='http://127.0.0.1:4193';
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4193',ARCTIC_STORAGE:storage},stdio:['ignore','pipe','pipe']});
let browser;
const errors=[];
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1536,height:1000},reducedMotion:'no-preference'}),page=await context.newPage();page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message));
 const request=async(route,data)=>{const r=await context.request.post(base+'/api/'+route,{data});assert(r.ok(),route+': '+await r.text());return r.json();};
 const login=role=>request('login',{email:role+'@arctic.demo',password:'Arctic2026!'});
 const jump=async id=>{await page.goto(base+'/#/'+id);await page.waitForFunction(id=>document.body.dataset.route===id&&document.querySelector('#app h1'),id.split('?')[0]);};
 await jump('home');const trigger=page.locator('.topnav .nav-group').first().locator(':scope > a');await trigger.hover();
 const menu=page.locator('.dropdown').first(),triggerBox=await trigger.boundingBox(),menuBox=await menu.boundingBox();
 assert(menuBox);assert(menuBox.y<=triggerBox.y+triggerBox.height+1,'Dropdown has no pointer gap');
 for(let i=1;i<=8;i++){await page.mouse.move(triggerBox.x+20,triggerBox.y+triggerBox.height-12+i*4);assert(await menu.isVisible(),'Menu must stay open while crossing the bridge');}
 await menu.getByRole('link',{name:'История конкурса',exact:true}).click();await page.waitForFunction(()=>document.body.dataset.route==='history');
 await jump('rules');await page.locator('[data-key="rules"][data-tab="1"]').click();
 await page.locator('[data-filter="0"]').selectOption({label:'Участие'});await page.locator('[data-filter="1"]').selectOption({label:'Регистрация'});
 assert.equal(await page.locator('.faq-item:visible').count(),2);await page.locator('.faq-item:visible summary').first().click();assert(await page.locator('.faq-item[open] p').isVisible());
 await page.locator('[data-search]').fill('кто');assert.equal(await page.locator('.faq-item:visible').count(),1);await page.locator('[data-search]').fill('');
 await page.locator('[data-filter="0"]').selectOption({label:'Проект'});assert.equal(await page.locator('.faq-item:visible').count(),0);assert(await page.locator('[data-faq-empty]').isVisible());
 const footer=await page.locator('.footer').boundingBox();assert(Math.abs(footer.y+footer.height-1000)<2,'Footer stays at viewport bottom on a short FAQ page');
 await page.locator('[data-key="rules"][data-tab="2"]').click();assert(await page.locator('[data-consent-panel]').isVisible());assert.match(await page.locator('[data-consent-panel]').innerText(),/участие ребёнка оформляется отдельно/);
 const pdf=await context.request.get(base+'/api/document?kind=privacy-consent');assert(pdf.ok());assert.equal((await PDFDocument.load(await pdf.body())).getPageCount(),1);
 await jump('register');await page.locator('[name="email"]').fill('preview@example.test');await page.locator('[name="password"]').fill('Arctic2026!');
 const input=await page.locator('[name="password"]').boundingBox(),eye=await page.locator('[data-action="password"]').first().boundingBox();assert(Math.abs(input.y+input.height/2-eye.y-eye.height/2)<1,'Password eye is vertically centered');
 await page.locator('[data-action="password"]').first().click();assert.equal(await page.locator('[name="password"]').getAttribute('type'),'text');await page.locator('[data-action="password"]').first().click();
 await page.getByRole('button',{name:'текстом согласия',exact:true}).click();await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('[name="email"]').inputValue(),'preview@example.test','Consent preview preserves registration form');assert.equal(await page.locator('[name="consent"]').isChecked(),false,'Reading the document does not grant consent');
 await login('participant');await request('profile',{name:'Анна Полярная',school:'Школа Северная',parent:'Иван Полярный',phone:'+7 900 111-22-33',parentEmail:'ivan@xn--e1afmkfd.xn--p1ai'});await jump('profile');
 assert.match(await page.locator('#main').innerText(),/ivan@пример\.рф/);assert.equal(await page.locator('.profile-row dl').getAttribute('translate'),'no');
 await page.locator('[data-profile-section="basic"]').click();assert.equal(await page.locator('dialog [name="parent"]').count(),0);await page.locator('dialog [name="name"]').fill('Ирина Снежная');await page.locator('dialog button').filter({hasText:'Сохранить'}).click();await page.locator('dialog[open]').waitFor({state:'hidden'});
 let profile=(await (await context.request.get(base+'/api/bootstrap')).json()).user.profile;assert.equal(profile.parent,'Иван Полярный');assert.equal(profile.parentEmail,'ivan@пример.рф');
 await page.locator('[data-profile-section="guardian"]').click();assert.equal(await page.locator('dialog [name="name"]').count(),0);await page.locator('dialog [name="parent"]').fill('Мария Снежная');await page.locator('dialog button').filter({hasText:'Сохранить'}).click();await page.locator('dialog[open]').waitFor({state:'hidden'});
 profile=(await (await context.request.get(base+'/api/bootstrap')).json()).user.profile;assert.equal(profile.name,'Ирина Снежная');assert.equal(profile.school,'Школа Северная');assert.equal(profile.parent,'Мария Снежная');
 const routes=['mentor','project','test-intro','documents','achievements','defense','project-results','profile','dashboard'];
 const nav=await page.locator('.sidebar nav a').evaluateAll(nodes=>nodes.map(e=>e.getAttribute('href')));
 for(const id of routes){await page.locator(`.sidebar nav a[href="#/${id}"]`).click();await page.waitForFunction(id=>document.body.dataset.route===id,id);assert.deepEqual(await page.locator('.sidebar nav a').evaluateAll(nodes=>nodes.map(e=>e.getAttribute('href'))),nav,'Participant navigation stays available on '+id);}
 await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));const side=await page.locator('.sidebar').evaluate(e=>({y:e.getBoundingClientRect().y,position:getComputedStyle(e).position,height:e.getBoundingClientRect().height,parent:e.parentElement.getBoundingClientRect().toJSON(),scroll:scrollY}));assert(Math.abs(side.y)<1,'Sidebar stays in place while content scrolls: '+JSON.stringify(side));
 await page.locator('.sidebar-exit').click();await page.waitForFunction(()=>document.body.dataset.route==='home');
 await login('teacher');await jump('teacher');await page.locator('.sidebar nav a[href="#/teacher?view=overview"]').click();await page.getByRole('heading',{name:'Рабочий стол',exact:true}).waitFor();await page.locator('.sidebar nav a[href="#/teacher"]').click();await page.getByRole('heading',{name:'Мои ученики',exact:true}).waitFor();await page.locator('.sidebar nav a[href="#/documents"]').click();await page.waitForFunction(()=>document.body.dataset.route==='documents');await page.locator('.sidebar nav a[href="#/teacher?view=overview"]').click();await page.getByRole('heading',{name:'Рабочий стол',exact:true}).waitFor();
 await login('participant');await jump('profile');
 for(const width of [390,768]){
  await page.setViewportSize({width,height:844});await page.locator('.sidebar nav a[href="#/test-intro"]').click();await page.waitForFunction(()=>document.body.dataset.route==='test-intro');await page.locator('.sidebar nav a[href="#/profile"]').click();await page.waitForSelector('.profile-row');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Navigation overflow at '+width);
  await page.locator('.sidebar-exit').click();await page.waitForFunction(()=>document.body.dataset.route==='home');await jump('profile');
 }
 await page.setViewportSize({width:1536,height:1000});await page.waitForFunction(()=>document.querySelector('.profile-row')?.closest('.card').dataset.motionSeen==='true');await page.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'&&Number.isFinite(a.effect.getTiming().iterations)));await mkdir('artifacts/screenshots',{recursive:true});await page.screenshot({path:'artifacts/screenshots/feedback-profile.png'});await jump('teacher'); // Role guard remains functional.
 assert(await page.locator('[data-form="login"]').isVisible());
 await jump('teacher?view=overview');assert(await page.locator('[data-form="login"]').isVisible(),'Teacher overview keeps its role guard');
 await writeFile('artifacts/feedback-results.json',JSON.stringify({passed:true,dropdownBridge:true,faqFilters:true,footer:true,separatePrivacyDocument:true,registrationPreserved:true,passwordAlignment:true,separateProfileForms:true,unicodeEmail:true,stableParticipantNavigation:true,teacherOverview:true,mobile:true,errors},null,2));assert.deepEqual(errors,[]);
 console.log('PASS feedback: dropdown pointer bridge, FAQ/search, footer, separate consent PDF, password alignment, isolated profile forms, Unicode email, persistent navigation and teacher overview.');
}finally{await browser?.close();server.kill();}
