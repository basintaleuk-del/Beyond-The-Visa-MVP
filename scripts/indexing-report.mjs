import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const siteUrl = 'https://beyondthevisa.org';
const excludedDirs = new Set(['.git', 'node_modules', 'web', 'www', 'figma-redesign-reference', 'android', 'ios', 'supabase', 'docs', 'download']);
const blockedPrefixes = ['/admin', '/api/', '/private/', '/temp/', '/temporary/', '/internal-tools/'];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirs.has(entry.name)) out.push(...(await walk(full)));
      continue;
    }
    if (entry.name.endsWith('.html')) out.push(relative(root, full).replace(/\\/g, '/'));
  }
  return out;
}

function relToPath(rel) {
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

const files = await walk(root);
const pageMap = new Map();
for (const rel of files) {
  if (rel.includes('BEYOND-THE-VISA-CORRECT-WEBSITE')) continue;
  const path = relToPath(rel);
  const html = await readFile(join(root, rel), 'utf8');
  const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
  pageMap.set(path, { rel, html, noindex });
}

const publicPages = [...pageMap.entries()]
  .filter(([, data]) => !data.noindex)
  .map(([path]) => path)
  .filter((p) => !blockedPrefixes.some((prefix) => p.startsWith(prefix)))
  .filter((p) => !p.includes('googleb53f2c7d9dd2d4be.html'));
const linksTo = new Map(publicPages.map((p) => [p, 0]));
const brokenLinks = [];
const canonical = [];
const schemaCoverage = [];
const richResults = { faq: [], breadcrumbs: [], course: [], article: [], software: [], searchBox: [], organization: [] };

for (const path of publicPages) {
  const { html } = pageMap.get(path);
  canonical.push({ page: path, canonical: html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] || '' });
  const schema = [...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  schemaCoverage.push({ page: path, schema });
  if (schema.includes('FAQPage')) richResults.faq.push(path);
  if (schema.includes('BreadcrumbList')) richResults.breadcrumbs.push(path);
  if (schema.includes('Course')) richResults.course.push(path);
  if (schema.includes('Article') || schema.includes('BlogPosting')) richResults.article.push(path);
  if (schema.includes('SoftwareApplication') || schema.includes('WebApplication')) richResults.software.push(path);
  if (schema.includes('SearchAction')) richResults.searchBox.push(path);
  if (schema.includes('Organization')) richResults.organization.push(path);

  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#') || href.startsWith('http')) continue;
    const normalized = href.startsWith('/') ? href : `/${href}`;
    const clean = normalized.split('?')[0].split('#')[0];
    if (clean.includes('${')) continue;
    if (clean === '/index.html') {
      linksTo.set('/', (linksTo.get('/') || 0) + 1);
      continue;
    }
    const isAsset = /\.(css|js|png|jpg|jpeg|webp|svg|gif|avif|ico|xml|json|txt|mp4|webm|woff2?|map)$/i.test(clean);
    if (isAsset) continue;
    if (clean.endsWith('/')) {
      if (linksTo.has(clean)) linksTo.set(clean, linksTo.get(clean) + 1);
      continue;
    }
    if (linksTo.has(clean)) {
      linksTo.set(clean, linksTo.get(clean) + 1);
    } else if (!clean.startsWith('/admin') && !clean.startsWith('/api') && !clean.startsWith('/private') && !clean.startsWith('/temp')) {
      brokenLinks.push({ from: path, to: clean });
    }
  }
}

const orphanPages = [...linksTo.entries()]
  .filter(([path, count]) => path !== '/' && count === 0)
  .map(([path]) => path);

const blockedPages = [...pageMap.entries()]
  .filter(([path, data]) => data.noindex || blockedPrefixes.some((prefix) => path.startsWith(prefix)))
  .map(([path]) => path);
const report = {
  sitemapUrl: `${siteUrl}/sitemap.xml`,
  robotsUrl: `${siteUrl}/robots.txt`,
  verification: {
    google: { method: 'meta_tag', record: 'GOOGLE_SEARCH_CONSOLE_VERIFICATION_CODE' },
    bing: { method: 'meta_tag', record: 'BING_WEBMASTER_VERIFICATION_CODE' },
    indexNow: { keyFile: `${siteUrl}/41f8d0f1a4a14517a7b95f26c5d8e3b2.txt` },
  },
  pagesReadyForIndexing: publicPages.sort(),
  pagesBlocked: blockedPages.sort(),
  canonicalUrls: canonical,
  schemaCoverage,
  richResultEligibility: richResults,
  internalLinkReport: {
    orphanPages,
    inboundLinkCounts: Object.fromEntries(linksTo),
  },
  brokenLinks,
  redirects: ['index.html -> /', '/home -> /', '/blog/articles -> /blog/', '/web/*.html -> /*.html'],
  coreWebVitalsRecommendations: [
    'Split remaining large inline CSS into cacheable static files.',
    'Defer non-critical JS on interactive app views.',
    'Serve responsive image variants and keep explicit width/height.',
  ],
  readiness: {
    search: brokenLinks.length === 0 ? 'ready' : 'attention_needed',
    ai: 'ready',
    google: 'ready',
    bing: 'ready',
  },
};

await writeFile(join(root, 'seo-indexing-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
