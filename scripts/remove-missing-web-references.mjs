import { access, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const webRoot = resolve(process.cwd(), 'web');
const entries = ['index.html', 'admin.html', 'cbt.html', 'nclex.html'];
let removed = 0;

for (const entry of entries) {
  const path = resolve(webRoot, entry);
  let html = await readFile(path, 'utf8');
  const tags = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>(?:<\/script>)?/gi)];
  for (const match of tags.reverse()) {
    const ref = match[1].split(/[?#]/)[0];
    if (!ref || ref.includes('${') || /^(?:https?:|data:|\/\/)/i.test(ref)) continue;
    const target = resolve(dirname(path), ref);
    if (!target.startsWith(webRoot)) continue;
    try {
      await access(target);
    } catch {
      html = html.slice(0, match.index) + html.slice(match.index + match[0].length);
      removed++;
      console.log(`Removed ${entry} -> ${ref}`);
    }
  }
  await writeFile(path, html, 'utf8');
}

console.log(`Removed ${removed} missing web reference(s).`);
