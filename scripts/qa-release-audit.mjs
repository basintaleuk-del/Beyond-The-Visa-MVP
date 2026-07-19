import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';

const root = resolve(process.cwd(), 'web');
const entries = ['index.html', 'admin.html', 'cbt.html', 'nclex.html'];
const failures = [];
const warnings = [];
const pass = (name) => console.log(`PASS ${name}`);
const fail = (name) => { failures.push(name); console.error(`FAIL ${name}`); };

for (const entry of entries) {
  const file = resolve(root, entry);
  const html = await readFile(file, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)=["']([^"'#?]+)(?:[?#][^"']*)?["']/gi)]
    .map((match) => match[1])
    .filter((ref) => !ref.includes('${') && !/^(?:https?:|data:|mailto:|tel:|\/\/)/i.test(ref));
  for (const ref of new Set(refs)) {
    const target = resolve(dirname(file), ref);
    if (!target.startsWith(root)) { fail(`${entry} contains unsafe local path ${ref}`); continue; }
    try { await access(target); } catch { fail(`${entry} is missing ${ref}`); }
  }
  if (!/<html[^>]+lang=["'][^"']+/i.test(html)) fail(`${entry} has a document language`); else pass(`${entry} document language`);
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) fail(`${entry} has a mobile viewport`); else pass(`${entry} mobile viewport`);
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(`${entry} has a page title`); else pass(`${entry} page title`);
  if (/<img(?![^>]*\balt=)[^>]*>/i.test(html)) fail(`${entry} has images without alt text`); else pass(`${entry} image alternatives`);
  if (/target=["']_blank["'](?![^>]*rel=["'][^"']*noopener)/i.test(html)) warnings.push(`${entry} may contain an external window without noopener`);
}

const jsFiles = (await readdir(root)).filter((name) => extname(name) === '.js');
let oversized = 0;
for (const name of jsFiles) {
  const size = (await stat(resolve(root, name))).size;
  if (size > 500_000) { warnings.push(`${name} is ${(size / 1024).toFixed(0)} KB and should be split later`); oversized++; }
}
pass(`${jsFiles.length} JavaScript assets inventoried (${oversized} over 500 KB)`);

const index = await readFile(resolve(root, 'index.html'), 'utf8');
if (!index.includes('security-hardening-v80.js')) fail('security monitoring is activated'); else pass('security monitoring is activated');
if (!index.includes('Content-Security-Policy')) fail('Content Security Policy is activated'); else pass('Content Security Policy is activated');
if (!index.includes('id="bottomNav"') && !index.includes('class="bottomNav"') && !index.includes('class="bottom-nav"')) {
  if (!/Home[\s\S]{0,300}Journey[\s\S]{0,300}(?:Ask Zibur|Zibur)[\s\S]{0,300}Learn[\s\S]{0,300}Costs/i.test(index)) fail('five-item bottom navigation remains available');
  else pass('five-item bottom navigation remains available');
} else pass('bottom navigation shell remains available');

for (const warning of warnings) console.warn(`WARN ${warning}`);
console.log(`\nRelease audit: ${failures.length} failure(s), ${warnings.length} warning(s).`);
if (failures.length) process.exitCode = 1;
