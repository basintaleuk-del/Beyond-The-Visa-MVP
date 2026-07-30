import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('homepage restores the approved premium dashboard theme with guarded fallback rendering', async () => {
  const html = await read('web/index.html');
  assert.equal((html.match(/id=["']home["']/g) || []).length, 1);
  assert.equal((html.match(/id=["']btv-dashboard-v3-script["']/g) || []).length, 1);
  assert.equal((html.match(/window\.renderDashboardInsights\s*=/g) || []).length, 1);
  assert.match(html, /window\.__btvHomeRendererInstalled/);
  assert.match(html, /window\.BTVHomeBoot/);
  assert.match(html, /dashboard-premium-v73\.css\?v=177/);
  assert.match(html, /dashboard-premium-v73\.js\?v=214/);
  assert.doesNotMatch(html, /experience-v30\.7\.js|recovery-v63\.js|dashboard-reference-v74\.js|mission-control-v76\.js/);
  assert.doesNotMatch(html, /setTimeout\s*\(\s*window\.renderDashboardInsights/);
});

test('secondary scripts do not replace or repeatedly mutate the homepage', async () => {
  const release = await read('web/release-v33.js');
  const platform = await read('web/platform-upgrade-v72.js');
  assert.doesNotMatch(release, /jobsShortcut|MutationObserver|setTimeout\s*\(\s*wire/);
  assert.doesNotMatch(platform, /window\.renderDashboardInsights\s*=|setTimeout\s*\(\s*(?:render|window\.renderDashboardInsights)/);
  assert.match(await read('web/index.html'), /btv:home-rendered/);
});

test('Quick actions keep photographic tiles at desktop and mobile widths', async () => {
  const css = await read('web/dashboard-premium-v73.css');
  assert.match(css, /\.quickGrid73\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.quickActionMedia73\{display:block/);
  assert.doesNotMatch(css, /\.quickActionMedia73\{display:none/);
  assert.match(css, /@media\(max-width:640px\)[\s\S]*?\.quickGrid73\{grid-template-columns:1fr\}/);
});

test('service worker never serves a cached obsolete HTML shell', async () => {
  const sw = await read('web/sw.js');
  const config = await read('web/platform-config.js');
  const cacheVersion = sw.match(/beyond-the-visa-assets-v(\d+)/)?.[1];
  const workerVersion = config.match(/sw\.js\?v=(\d+)/)?.[1];
  assert.ok(cacheVersion);
  assert.equal(workerVersion, cacheVersion);
  assert.match(sw, /cache:\s*['"]no-store['"]/);
  assert.match(sw, /skipWaiting/);
  assert.match(sw, /clients\.claim/);
  assert.match(sw, /push/);
  assert.match(config, /sw\.js\?v=\d+/);
  assert.match(config, /updateViaCache:\s*['"]none['"]/);
});

test('deployable source is free of common mojibake sequences', async () => {
  const files = ['web/index.html', 'web/admin.html', 'web/cbt.html', 'web/cbt.js', 'web/nclex.html', 'web/nclex.js', 'web/sw.js'];
  const bad = /â€|â†|âœ|ðŸ|Ã|Â|ï¿½|�/;
  for (const file of files) assert.doesNotMatch(await read(file), bad, file);
});
