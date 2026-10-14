import { createRequire } from 'node:module';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const sharp=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const source='C:/Users/user/Downloads/arctic-design/arctic-design';
const out=new URL('../dist/assets/',import.meta.url);
await mkdir(out,{recursive:true});
const crops={
  mountain:['01-public.png',1090,72,390,118],
  iceberg:['03-media-news.png',310,235,134,113],
  bear:['03-media-news.png',35,235,270,149],
  aurora:['03-media-news.png',35,391,270,76],
  ship:['03-media-news.png',310,354,134,112],
  whale:['03-media-news.png',449,354,122,112],
  ice:['03-media-news.png',578,354,153,113],
  islands:['02-participation.png',522,706,214,70],
  explorer:['01-public.png',432,759,138,58],
  tundra:['01-public.png',507,441,88,58],
  owl:['03-media-news.png',986,211,163,70],
  station:['03-media-news.png',1163,211,163,70],
  reindeer:['03-media-news.png',1163,359,163,69],
  portrait:['05-participant.png',983,174,107,105],
  teacher:['05-participant.png',211,778,60,59],
  mentor:['05-participant.png',211,913,60,58],
  certificate:['06-test-cert.png',953,732,301,236],
  map:['09-admin.png',176,248,237,124],
  map2:['10-admin-ops-final.png',939,846,268,94],
  presentation:['08-teacher-expert-final.png',975,589,230,180],
};
for(const [name,[file,left,top,width,height]] of Object.entries(crops))await sharp(path.join(source,file)).extract({left,top,width,height}).webp({quality:92}).toFile(fileURLToPath(new URL(name+'.webp',out)));
await sharp('C:/Users/user/.codex/generated_images/01a1354a-fe69-7601-af6e-71efc2005e4f/exec-48ac70c8-c3e7-4c59-bbdf-2355a342e128.png').webp({quality:94}).toFile(fileURLToPath(new URL('hero.webp',out)));
// Preserve the supplied bear mark, without redrawing it.
await sharp(path.join(source,'approved-home.png')).extract({left:61,top:22,width:51,height:53}).png().toFile(fileURLToPath(new URL('logo.png',out)));
for(const [family,name] of [['Manrope:wght@400;500;600;700;800','manrope'],['Anton','anton']]){
  try{
    const css=await(await fetch('https://fonts.googleapis.com/css2?family='+family+'&display=swap',{headers:{'User-Agent':'Mozilla/5.0'}})).text();
    const urls=[...css.matchAll(/url\((https:[^)]+)\)/g)].map(m=>m[1]);
    let sheet=css;for(let i=0;i<urls.length;i++){const filename=name+'-'+i+'.woff2';await writeFile(new URL(filename,out),Buffer.from(await(await fetch(urls[i])).arrayBuffer()));sheet=sheet.replace(urls[i],'assets/'+filename);}
    await writeFile(new URL('../'+name+'.css',out),sheet);
  }catch(e){console.log('System font fallback:',name,e.message);}
}
await writeFile(new URL('favicon.svg',out),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#031725"/><text x="20" y="28" text-anchor="middle" font-family="Arial" font-size="25" fill="#91dcc7">А</text></svg>');
console.log('Assets extracted and optimized.');
