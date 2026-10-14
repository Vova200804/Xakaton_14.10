import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {screens} from '../dist/data.js';
const base='http://127.0.0.1:4190';
const storage=await mkdtemp(path.join(tmpdir(),'arctic-account-'));
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4190',ARCTIC_STORAGE:storage},stdio:['ignore','pipe','pipe']});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
 const context=await browser.newContext({viewport:{width:1536,height:1024},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(4000);page.on('pageerror',e=>errors.push(e.message));
 const request=async(route,data)=>{const r=await context.request.post(base+'/api/'+route,{data});assert(r.ok(),route+': '+await r.text());return r.json();};
 const login=role=>request('login',{email:role+'@arctic.demo',password:'Arctic2026!'});
 const jump=async id=>{await page.goto(base+'/#/'+id);await page.waitForFunction(id=>document.body.dataset.route===id&&document.querySelector('[data-action="account"]'),id);};
 const openAccount=async()=>{await page.locator('[data-action="account"]').first().click();await page.locator('dialog[open]').waitFor();};
 await login('participant');await page.goto(base+'/#/dashboard');await page.waitForSelector('.topbar>.btn');
 // Reproduce the screenshot: clicking the name on the dashboard must open an account menu.
 await page.locator('.topbar>.btn').click();await page.locator('dialog[open]').waitFor();
 await page.getByRole('link',{name:'Мой профиль',exact:true}).click();await page.waitForSelector('.profile-row');assert.equal(new URL(page.url()).hash,'#/profile');
 const email='switch-user@example.test';const {code}=await request('register-code',{email});await request('register',{email,password:'Arctic2026!',code,role:'participant',consent:true,parentConsent:true});await request('profile',{name:'Участник Сменённый'});
 await login('participant');await jump('dashboard');await openAccount();await page.getByRole('button',{name:'Сменить аккаунт',exact:true}).click();
 await page.locator('dialog [name="email"]').fill(email);await page.locator('dialog [name="password"]').fill('wrong');await page.locator('dialog [data-form="login"] button[type="submit"]').click();await page.locator('dialog .form-error').filter({hasText:/парол|данн|невер/i}).waitFor();assert.equal((await (await context.request.get(base+'/api/bootstrap')).json()).user.email,'participant@arctic.demo');
 await page.locator('dialog [name="password"]').fill('Arctic2026!');await page.locator('dialog [data-form="login"] button[type="submit"]').click();await page.locator('dialog[open]').waitFor({state:'hidden'});await page.locator('.topbar>.btn').filter({hasText:'Участник Сменённый'}).waitFor();assert.equal(new URL(page.url()).hash,'#/dashboard');
 await openAccount();await page.getByRole('button',{name:'Сменить аккаунт',exact:true}).click();await page.getByRole('button',{name:'Выбрать демо-аккаунт',exact:true}).click();await page.locator('dialog [data-action="demo-login"][data-role="participant"]').click();await page.locator('.topbar>.btn').filter({hasText:'Петрова Анна'}).waitFor();assert.equal(new URL(page.url()).hash,'#/dashboard');
 // Login into a guarded route that is already in the URL must replace the login form.
 await page.goto(base+'/#/expert');await page.waitForSelector('[data-form="login"]');await page.locator('[data-form="login"] [name="email"]').fill('expert@arctic.demo');await page.locator('[data-form="login"] [name="password"]').fill('Arctic2026!');await page.locator('[data-form="login"] button:not([type])').click();await page.locator('.workspace[data-role="expert"]').waitFor();
 const needed={dashboard:'participant',profile:'participant',mentor:'participant',security:'participant','test-intro':'participant',test:'participant','test-result':'participant',achievements:'participant',submit:'participant',project:'participant','project-results':'participant',defense:'participant',teacher:'teacher',expert:'expert',evaluation:'expert',ranking:'commission',admin:'admin',content:'admin',settings:'admin',questions:'admin',users:'admin',distribution:'admin',mailing:'admin',analytics:'admin'};
 let role='expert';
 for(const screen of screens){
  const required=needed[screen.id]||'participant';if(required!==role){await login(required);role=required;}await jump(screen.id);await openAccount();
  assert.equal(await page.getByRole('button',{name:'Сменить аккаунт',exact:true}).count(),1,screen.id);assert.equal(await page.getByRole('button',{name:'Выйти',exact:true}).count(),1,screen.id);
  await page.locator('dialog').getByRole(role==='participant'?'link':'button',{name:'Мой профиль',exact:true}).click();
  if(role==='participant'){await page.waitForSelector('.profile-row');assert.equal(new URL(page.url()).hash,'#/profile');}else{await page.locator('dialog h2').filter({hasText:'Мой профиль'}).waitFor();assert.match(await page.locator('#dialog-body').innerText(),new RegExp(role+'@arctic\\.demo'));await page.keyboard.press('Escape');}
 }
 await login('participant');await jump('home');await page.locator('[data-action="account"]').first().focus();await page.keyboard.press('Enter');await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');assert(await page.locator('[data-action="account"]').first().evaluate(e=>e===document.activeElement));
 await openAccount();await page.getByRole('button',{name:'Сменить аккаунт',exact:true}).click();await page.getByRole('button',{name:'Выбрать демо-аккаунт',exact:true}).click();await page.locator('dialog [data-action="demo-login"][data-role="teacher"]').click();await page.locator('.workspace[data-role="teacher"]').waitFor();
 await page.goBack();await page.waitForFunction(()=>document.body.dataset.route==='home'&&document.querySelector('[data-action="account"]'));assert.equal((await (await context.request.get(base+'/api/bootstrap')).json()).user.role,'teacher');await jump('teacher');
 await page.setViewportSize({width:390,height:844});await page.locator('.workspace-bar [data-action="account"]').click();await page.getByRole('button',{name:'Сменить аккаунт',exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.keyboard.press('Escape');await openAccount();await page.getByRole('button',{name:'Выйти',exact:true}).click();await page.waitForFunction(()=>location.hash==='#/home'&&document.querySelector('.topbar a[href="#/login"]'));assert.equal((await (await context.request.get(base+'/api/bootstrap')).json()).user,null);
 await page.locator('.topbar a[href="#/login"]').click();await page.waitForSelector('[data-form="login"]');assert(await page.locator('[data-action="demo"]').isVisible());
 assert.deepEqual(errors,[]);await mkdir('artifacts',{recursive:true});await writeFile('artifacts/account-navigation-results.json',JSON.stringify({passed:true,screens:40,sameRouteAccountSwitch:true,guardedRouteLogin:true,invalidLoginPreservesSession:true,keyboardFocus:true,mobileSwitch:true,logout:true,errors},null,2));
 console.log('PASS account navigation: all 40 screens, profile, same-route login/switch, wrong password, demo roles, keyboard, mobile and logout.');
}finally{await browser.close();server.kill();}
