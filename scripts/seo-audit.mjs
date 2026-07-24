import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const excludedDirs = new Set(['.git', 'node_modules', 'web', 'www', 'figma-redesign-reference', 'android', 'ios', 'supabase', 'docs', 'download']);
const excludedFiles = new Set(['BEYOND-THE-VISA-CORRECT-WEBSITE.html']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirs.has(entry.name)) {
        files.push(...(await walk(full)));
      }
      continue;
    }
    if (entry.name.endsWith('.html')) {
      if (excludedFiles.has(entry.name)) continue;
      files.push(relative(root, full).replace(/\\/g, '/'));
    }
  }
  return files;
}

function toPath(rel) {
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

const files = await walk(root);
const publicFiles = [];
for (const rel of files) {
  if (rel.includes('/admin') || rel === 'admin.html' || rel.startsWith('web/')) continue;
  const html = await readFile(join(root, rel), 'utf8');
  if (/noindex/i.test(html)) continue;
  publicFiles.push({ rel, html, path: toPath(rel) });
}

const titleMap = new Map();
const descMap = new Map();
const missing = [];
const schemas = new Set();
const blocked = [];
for (const file of publicFiles) {
  const title = file.html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const desc = file.html.match(/<meta name="description" content="([^"]+)"/i)?.[1]?.trim();
  const canonical = file.html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1]?.trim();
  if (!title || !desc || !canonical) missing.push(file.path);
  if (title) {
    if (!titleMap.has(title)) titleMap.set(title, []);
    titleMap.get(title).push(file.path);
  }
  if (desc) {
    if (!descMap.has(desc)) descMap.set(desc, []);
    descMap.get(desc).push(file.path);
  }
  for (const m of file.html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) {
    schemas.add(m[1]);
  }
}

for (const rel of files) {
  if (rel.includes('/admin') || rel === 'admin.html' || rel.startsWith('web/')) {
    blocked.push(toPath(rel));
  }
}

const duplicateTitles = [...titleMap.entries()].filter(([, list]) => list.length > 1);
const duplicateDescriptions = [...descMap.entries()].filter(([, list]) => list.length > 1);

const metadataScore = Math.max(0, Math.round(((publicFiles.length - missing.length) / Math.max(1, publicFiles.length)) * 100));
const duplicatePenalty = Math.min(40, duplicateTitles.length * 3 + duplicateDescriptions.length * 2);
const seoScore = Math.max(40, metadataScore - duplicatePenalty);
const googleScore = Math.max(40, seoScore - (blocked.length ? 0 : 0));
const aiScore = Math.max(40, seoScore - (schemas.size < 8 ? 10 : 0));

const report = {
  totals: {
    publicPages: publicFiles.length,
    schemaTypes: [...schemas].sort(),
  },
  scores: {
    seo: seoScore,
    googleReadiness: googleScore,
    aiReadiness: aiScore,
  },
  issues: {
    missingMetadataPages: missing,
    duplicateTitles: duplicateTitles.map(([title, pages]) => ({ title, pages })),
    duplicateDescriptions: duplicateDescriptions.map(([description, pages]) => ({ description, pages })),
    blockedFromIndexing: blocked.sort(),
  },
};

console.log(JSON.stringify(report, null, 2));
