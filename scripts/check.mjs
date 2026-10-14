import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const base = new URL('../dist/',import.meta.url);
for (const name of ['app.js','data.js','ui.js','public.js','account.js','admin.js','fidelity.js','motion.js']) {
  const result=spawnSync(process.execPath,['--check',fileURLToPath(new URL(name,base))],{encoding:'utf8'});
  if(result.status!==0) throw new Error(result.stderr);
}
const {screens}=await import('../dist/data.js');
if(screens.length!==40 || new Set(screens.map(s=>s.id)).size!==40)throw new Error('Должно быть 40 уникальных экранов');
for(const file of ['index.html','styles.css','fidelity.css','motion.css','assets/hero.webp','assets/home-reference.webp','assets/arctic-scene-hd.webp','assets/arctic-wordmark.svg','assets/fonts/Manrope-Variable.ttf','assets/expedition.webp']) await readFile(new URL(file,base));
console.log('Build OK: 40 screens, valid JavaScript, assets present. Static output: dist/');
