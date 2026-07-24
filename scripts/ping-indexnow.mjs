import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const host = 'https://beyondthevisa.org';
const key = '41f8d0f1a4a14517a7b95f26c5d8e3b2';
const keyLocation = `${host}/${key}.txt`;

const sitemap = await readFile(join(root, 'sitemap-pages.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1])
  .filter((loc) => !loc.endsWith('.xml'))
  .slice(0, 1000);

const payload = {
  host: 'beyondthevisa.org',
  key,
  keyLocation,
  urlList: urls,
};

const endpoints = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
];

for (const endpoint of endpoints) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  console.log(`${endpoint} -> ${response.status}`);
}
