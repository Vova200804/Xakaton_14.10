import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {screens} from '../dist/data.js';

const storage=await mkdtemp(path.join(tmpdir(),'arctic-motion-'));
const base='http://127.0.0.1:4191';
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4191',ARCTIC_STORAGE:storage},stdio:['ignore','pipe','pipe']});
let browser;
const errors=[],results=[];
try {
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1536,height:1024},reducedMotion:'no-preference'});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))errors.push(r.status()+' '+r.url());});
 const roles={dashboard:'participant',profile:'participant',mentor:'participant',security:'participant','test-intro':'participant',test:'participant','test-result':'participant',achievements:'participant',submit:'participant',project:'participant','project-results':'participant',defense:'participant',teacher:'teacher',expert:'expert',evaluation:'expert',ranking:'commission',admin:'admin',content:'admin',settings:'admin',questions:'admin',users:'admin',distribution:'admin',mailing:'admin',analytics:'admin'};
 const jump=async id=>{await page.goto(base+'/#/'+id);await page.waitForFunction(id=>document.body.dataset.route===id&&document.querySelector('#app h1,#app h2')&&document.body.dataset.motionMode==='full',id);};
 let currentRole;
 for(const screen of screens){
  const role=roles[screen.id]||'participant';
  if(role!==currentRole){const r=await context.request.post(base+'/api/login',{data:{email:role+'@arctic.demo',password:'Arctic2026!'}});assert(r.ok());currentRole=role;}
  await jump(screen.id);
  await page.waitForFunction(()=>!!document.querySelector('[data-motion="reveal"][data-motion-seen="true"]'));
  const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('#app *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2&&getComputedStyle(e).position!=='absolute').map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,html:e.outerHTML.slice(0,350),parent:e.parentElement.className,transform:getComputedStyle(e).transform})).slice(0,6)}));
  assert(overflow.scroll<=overflow.width+2,'Motion overflow: '+screen.id+' '+JSON.stringify(overflow));
  assert(!(await page.locator('#app').innerText()).includes('Не удалось загрузить страницу'),screen.id);
  // Content below the viewport must remain readable even before its entrance.
  assert(await page.locator('[data-motion="reveal"]').evaluateAll(nodes=>nodes.filter(n=>!n.hidden&&!n.closest('[hidden]')).every(n=>getComputedStyle(n).visibility!=='hidden')));
  results.push(screen.id);
 }
 await jump('home');await page.evaluate(()=>document.fonts.ready);
 const hero=page.locator('.home-hero');await page.waitForFunction(()=>document.querySelector('.home-hero').dataset.motionActive==='true');
 assert.equal(await page.locator('.home-hero > .motion-atmosphere').count(),1);
  assert.equal(await page.locator('.home-hero .motion-snowflake').count(),48);
  const flakeY=await page.locator('.motion-snowflake').nth(10).evaluate(e=>e.getBoundingClientRect().y);
  await page.waitForFunction(y=>document.querySelectorAll('.motion-snowflake')[10].getBoundingClientRect().y>y+3,flakeY);
 await hero.hover({position:{x:1500,y:220}});
 await page.waitForFunction(()=>document.querySelector('.home-hero').style.getPropertyValue('--scene-x')!=='');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Pointer effect must stay inside hero');
  await page.setViewportSize({width:1536,height:480});
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
 await page.waitForFunction(()=>document.querySelector('.home-hero').dataset.motionActive==='false');
 assert.equal(await hero.evaluate(e=>getComputedStyle(e.querySelector('.motion-atmosphere'),'::before').animationPlayState),'paused');
  assert.equal(await page.locator('.motion-snowflake').first().evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
  await page.setViewportSize({width:1536,height:1024});
 await page.evaluate(()=>scrollTo(0,0));
 const button=page.locator('.topbar [data-action="account"]');await button.waitFor();await button.hover();
 await page.mouse.down();await page.locator('.motion-ink').waitFor();await page.mouse.up();await page.locator('dialog[open]').waitFor();
 assert.equal(await page.locator('dialog').evaluate(e=>getComputedStyle(e).animationName),'motion-dialog');
 await page.keyboard.press('Escape');await page.locator('.motion-ink').waitFor({state:'detached'});
 await page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.target?.dataset?.motion).forEach(a=>a.finish()));
 await mkdir('artifacts/screenshots',{recursive:true});await page.screenshot({path:'artifacts/screenshots/motion-home-desktop.png'});
  await page.locator('.news-mini').first().scrollIntoViewIfNeeded();await page.locator('.news-mini').first().hover();await page.screenshot({path:'artifacts/screenshots/motion-card-hover.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.body.dataset.motionMode==='reduced');
 assert.equal(await page.locator('.motion-atmosphere').first().evaluate(e=>getComputedStyle(e).display),'none');
 assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0,'Changing the motion preference cancels running effects');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.body.dataset.motionMode==='full');await page.evaluate(()=>scrollTo(0,0));
 await page.waitForFunction(()=>document.querySelector('.home-hero').dataset.motionActive==='true');
 assert.equal(await page.locator('.home-hero > .motion-atmosphere').count(),1,'Preference changes must not duplicate background layers');
  assert.equal(await page.locator('.motion-snowflake').count(),48,'Preference changes must not duplicate snow');
  await context.request.post(base+'/api/login',{data:{email:'participant@arctic.demo',password:'Arctic2026!'}});
 for(const width of [390,768]){
  await page.setViewportSize({width,height:844});
  for(const id of ['home','login','dashboard','test-result','achievements']){
   await jump(id);await page.waitForFunction(()=>!!document.querySelector('[data-motion-seen="true"]'));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),id+' overflow at '+width);
   assert.equal(await page.locator('.motion-snow').count(),id==='home'?1:0,'Snow belongs only on the homepage');
   if(id==='home'&&width===390)assert.equal(await page.locator('.motion-snowflake').evaluateAll(nodes=>nodes.filter(e=>getComputedStyle(e).display!=='none').length),24);
   await page.screenshot({path:`artifacts/screenshots/motion-${id}-${width}.png`});
  }
 }
 await page.setViewportSize({width:1536,height:1024});
 await context.request.post(base+'/api/login',{data:{email:'admin@arctic.demo',password:'Arctic2026!'}});
 await jump('questions');await page.waitForSelector('.table-pagination');await page.getByRole('button',{name:'Страница 2',exact:true}).click();assert.equal(await page.locator('tbody tr:visible').count(),5);
 await page.locator('[data-search]').fill('вечная мерзлота');assert.equal(await page.locator('tbody tr:visible').count(),1);await page.locator('[data-search]').fill('');assert.equal(await page.locator('tbody tr:visible').count(),5);
 await page.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'&&Number.isFinite(a.effect.getTiming().iterations)));
 assert.equal(await page.locator('.motion-ink').count(),0,'Interaction decorations are cleaned up');
 assert.deepEqual(errors,[]);
 await writeFile('artifacts/motion-results.json',JSON.stringify({passed:true,screens:results,reducedMotion:true,pointerOverflow:false,offscreenPaused:true,rippleCleanup:true,mobileWidths:[390,768],pagination:true,errors},null,2));
 console.log('PASS motion: 40 screens with effects enabled, pointer/ripple, dialogs, offscreen pause, live reduced motion, mobile, pagination and cleanup.');
} finally {await browser?.close();server.kill();}
