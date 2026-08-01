import { access, readFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

const root = resolve(process.cwd(), 'web');
const entries = ['index.html', 'admin.html', 'cbt.html', 'nclex.html'];
const missing = [];

for (const entry of entries) {
  const file = resolve(root, entry);
  const html = await readFile(file, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)=["']([^"'#?]+)(?:[?#][^"']*)?["']/gi)]
    .map((match) => match[1])
    .filter((ref) => !ref.includes('${'))
    .filter((ref) => !/^(?:https?:|data:|mailto:|tel:|\/\/)/i.test(ref));
  for (const ref of new Set(refs)) {
    if (ref.includes('$')) continue;
    const target = ref.startsWith('/') ? resolve(root, ref.slice(1)) : resolve(dirname(file), ref);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      missing.push(`${entry}: unsafe reference ${ref}`);
      continue;
    }
    try { await access(target); } catch { missing.push(`${entry}: missing ${ref}`); }
  }
}

if (missing.length) {
  console.error('Web asset validation failed:\n' + missing.map((item) => `- ${item}`).join('\n'));
  process.exitCode = 1;
} else console.log('Web asset validation passed.');
