import { readFile, writeFile } from 'node:fs/promises';

const appPath = new URL('../web/app-content-v171.js', import.meta.url);
const indexPath = new URL('../web/index.html', import.meta.url);
const app = await readFile(appPath, 'utf8');
const index = await readFile(indexPath, 'utf8');
const pattern = /function installBrandArtwork\(\)\{const logo='data:image\/png;base64,[^']+';[\s\S]*?document\.querySelector\('\.brand small'\)\.textContent='[^']*'\}/;
const replacement = `function installBrandArtwork(){const logo='favicon-512-v281.png';const mark=document.querySelector('.brand .mark');if(mark){mark.innerHTML='<img src="'+logo+'" width="48" height="48" alt="Beyond The Visa logo">';mark.className='mark suppliedLogo'}const authMark=document.querySelector('.authMark');if(authMark){const img=document.createElement('img');img.className='authBrandLogo';img.src=logo;img.width=512;img.height=512;img.alt='Beyond The Visa — Guidance. Preparation. Your future.';authMark.replaceWith(img)}document.querySelector('.brand b').textContent='Beyond The Visa';document.querySelector('.brand small').textContent='Guidance · preparation · your future'}`;

const matches = app.match(new RegExp(pattern.source, 'g')) || [];
const alreadyOptimised = matches.length === 0
  && app.includes("const logo='favicon-512-v281.png'")
  && index.includes("script.src='app-content-v171.js?v=301'");
if (alreadyOptimised) {
  console.log('App content is already optimised.');
  process.exit(0);
}
if (matches.length !== 1) throw new Error(`Expected one embedded brand payload, found ${matches.length}.`);
if (!index.includes("script.src='app-content-v171.js?v=172'")) throw new Error('Expected app-content loader version was not found.');

const optimised = app.replace(pattern, replacement);
await writeFile(appPath, optimised, 'utf8');
await writeFile(indexPath, index.replace("script.src='app-content-v171.js?v=172'", "script.src='app-content-v171.js?v=301'"), 'utf8');
console.log(`Optimised app content from ${Buffer.byteLength(app).toLocaleString()} to ${Buffer.byteLength(optimised).toLocaleString()} bytes.`);
