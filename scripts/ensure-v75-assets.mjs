import { readFile, writeFile } from 'node:fs/promises';

const path = 'web/index.html';
let html = await readFile(path, 'utf8');
const tag = '<script src="zibur-foundation-v75.js?v=75"></script>';
if (!html.includes('zibur-foundation-v75.js')) html = html.replace('</body>', `${tag}</body>`);
await writeFile(path, html, 'utf8');
console.log('v75 canonical assets are referenced.');
