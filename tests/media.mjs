import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const storage=await mkdtemp(path.join(tmpdir(),'arctic-media-')),base='http://127.0.0.1:4195';
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4195',ARCTIC_STORAGE:storage},stdio:['ignore','pipe','pipe']});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'no-preference'}),page=await context.newPage(),errors=[],mediaRequests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('.m4a')||r.url().endsWith('.mp4'))mediaRequests.push(r.url());});
 const jump=async id=>{await page.goto(base+'/#/'+id);await page.waitForFunction(id=>document.body.dataset.route===id,id.split('?')[0]);};
 await jump('home');await page.locator('#music-toggle').waitFor();
 assert.equal(await page.locator('audio[data-background-music]').evaluate(e=>e.paused),true);assert.equal(mediaRequests.length,0,'Initial page must not load/play audio or video');
 assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'),'false');
 await page.locator('#music-toggle').click();await page.waitForFunction(()=>document.querySelector('audio[data-background-music]').currentTime>.15);
 assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'),'true');
 const before=await page.locator('audio[data-background-music]').evaluate(e=>e.currentTime);
 await page.evaluate(()=>location.hash='#/explore');await page.waitForFunction(()=>document.body.dataset.route==='explore');
 assert.equal(await page.locator('audio[data-background-music]').count(),1);assert(await page.locator('audio[data-background-music]').evaluate(e=>!e.paused&&e.currentTime>=0));
 await page.evaluate(()=>location.hash='#/home');await page.waitForFunction(()=>document.body.dataset.route==='home');await page.locator('.video-cta').click();await page.locator('video[data-arctic-video]').waitFor();
 await page.waitForFunction(()=>Number.isFinite(document.querySelector('video[data-arctic-video]').duration));
 assert(Math.abs(await page.locator('video').evaluate(e=>e.duration)-30)<.1);assert.equal(await page.locator('video').evaluate(e=>e.paused),true,'Opening dialog must not autoplay video');
 await page.locator('video').evaluate(e=>e.play());await page.waitForFunction(()=>document.querySelector('video').currentTime>.2);
 assert.equal(await page.locator('audio[data-background-music]').evaluate(e=>e.paused),true,'Video pauses background music');
 await page.locator('video').evaluate(e=>e.pause());assert.equal(await page.locator('audio[data-background-music]').evaluate(e=>e.paused),true,'Paused video does not start background music unexpectedly');
 await page.locator('video').evaluate(e=>e.currentTime=21);await page.waitForFunction(()=>document.querySelector('video').currentTime>=20.9&&document.querySelector('video').readyState>=2);assert.equal(await page.locator('video').evaluate(e=>e.error),null);
 await page.locator('video').evaluate(e=>{window.closedVideo=e;return e.play();});await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'});
 assert(await page.evaluate(()=>window.closedVideo.paused));await page.waitForFunction(()=>!document.querySelector('audio[data-background-music]').paused);
 await page.locator('#music-toggle').click();assert.equal(await page.locator('audio[data-background-music]').evaluate(e=>e.paused),true);assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'),'false');
 await jump('media');await page.locator('[data-key="media"][data-tab="1"]').click();assert.equal(await page.locator('.media-grid [data-action="video"]:visible').count(),1);
 await page.locator('.media-grid [data-action="video"]:visible').click();await page.waitForFunction(()=>Number.isFinite(document.querySelector('video').duration));await page.locator('video').evaluate(e=>e.play());await page.waitForFunction(()=>document.querySelector('video').currentTime>.1);await page.evaluate(()=>location.hash='#/explore');await page.waitForFunction(()=>document.body.dataset.route==='explore');assert.equal(await page.locator('video').count(),0);assert.equal(await page.locator('audio[data-background-music]').evaluate(e=>e.paused),true,'Opted-out music remains off after video closes');
 await jump('media');await page.locator('audio[data-standalone-music]').evaluate(e=>e.play());await page.waitForFunction(()=>document.querySelector('audio[data-standalone-music]').currentTime>.1);await page.locator('#music-toggle').click();assert.equal(await page.locator('audio[data-standalone-music]').evaluate(e=>e.paused),true,'Only one music source plays');await page.waitForFunction(()=>!document.querySelector('audio[data-background-music]').paused);await page.locator('#music-toggle').click();
 // Exercise actual hidden-tab events while sound is playing.
 await page.locator('#music-toggle').click();await page.waitForFunction(()=>!document.querySelector('audio[data-background-music]').paused);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('audio[data-background-music]').evaluate(e=>e.paused),true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>!document.querySelector('audio[data-background-music]').paused);await page.locator('#music-toggle').click();
 const videoPath='/assets/media/arctic-journey.mp4';let r=await context.request.head(base+videoPath);assert.equal(r.status(),200);assert.equal(r.headers()['content-type'],'video/mp4');const size=Number(r.headers()['content-length']);assert(size>1000000);assert.equal((await r.body()).length,0);
 r=await context.request.get(base+videoPath,{headers:{Range:'bytes=0-1023'}});assert.equal(r.status(),206);assert.equal((await r.body()).length,1024);assert.equal(r.headers()['content-range'],`bytes 0-1023/${size}`);
 r=await context.request.get(base+videoPath,{headers:{Range:'bytes=-512'}});assert.equal(r.status(),206);assert.equal((await r.body()).length,512);
 for(const range of [`bytes=${size}-`, 'bytes=9-1','bytes=-0','bytes=0-5,7-9'])assert.equal((await context.request.get(base+videoPath,{headers:{Range:range}})).status(),416);
 assert.equal((await context.request.get(base+'/assets/media/arctic-ambient.m4a')).headers()['content-type'],'audio/mp4');assert.match((await context.request.get(base+'/assets/media/arctic-description.vtt')).headers()['content-type'],/text\/vtt/);
 await mkdir('artifacts/screenshots',{recursive:true});
 for(const width of [390,768,1440]){
  await page.setViewportSize({width,height:width===1440?960:844});await jump('home');await page.locator('.video-cta').click();await page.locator('video').waitFor();await page.waitForFunction(()=>document.querySelector('video').readyState>=4);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No horizontal overflow '+width);await page.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'&&Number.isFinite(a.effect.getTiming().iterations)));const box=await page.locator('video').boundingBox();assert(box.width<=width&&box.height>100);await page.screenshot({path:`artifacts/screenshots/media-player-${width}.png`});await page.keyboard.press('Escape');
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#music-toggle').click();await page.waitForFunction(()=>!document.querySelector('audio[data-background-music]').paused);assert.equal(await page.locator('.music-bars i').first().evaluate(e=>getComputedStyle(e).animationName),'none');await page.locator('#music-toggle').click();
 assert.deepEqual(errors,[]);await writeFile('artifacts/media-test-results.json',JSON.stringify({passed:true,duration:30,noAutoplay:true,musicPersistsAcrossRoutes:true,singleMusicSource:true,videoSeek:true,dialogCleanup:true,hiddenTab:true,rangeRequests:true,mobileWidths:[390,768,1440],reducedMotion:true,errors},null,2));
 console.log('PASS media: real MP4/M4A playback, seek, no autoplay, music controls, one audio source, dialog/route cleanup, hidden-tab pause, byte ranges, responsive player and reduced motion.');
}finally{await browser?.close();server.kill();}
