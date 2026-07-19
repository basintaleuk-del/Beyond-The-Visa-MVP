import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('homepage has one approved, guarded renderer and no obsolete layers', async () => {
  const html = await read('web/index.html');
  assert.equal((html.match(/id=["']home["']/g) || []).length, 1);
  assert.equal((html.match(/id=["']btv-dashboard-v3-script["']/g) || []).length, 1);
  assert.equal((html.match(/window\.renderDashboardInsights\s*=/g) || []).length, 1);
  assert.match(html, /window\.__btvHomeRendererInstalled/);
  assert.match(html, /window\.BTVHomeBoot/);
  assert.match(html, /id="btvHomeCompatibility"[^>]*hidden/);
  assert.doesNotMatch(html, /experience-v30\.7\.js|recovery-v63\.js|dashboard-premium-v73\.js|dashboard-reference-v74\.js|mission-control-v76\.js/);
  assert.doesNotMatch(html, /setTimeout\s*\(\s*window\.renderDashboardInsights/);
});

test('secondary scripts do not replace or repeatedly mutate the homepage', async () => {
  const release = await read('web/release-v33.js');
  const platform = await read('web/platform-upgrade-v72.js');
  assert.doesNotMatch(release, /jobsShortcut|MutationObserver|setTimeout\s*\(\s*wire/);
  assert.doesNotMatch(platform, /window\.renderDashboardInsights\s*=|setTimeout\s*\(\s*(?:render|window\.renderDashboardInsights)/);
  assert.match(platform, /btv:home-rendered/);
});

test('service worker never serves a cached obsolete HTML shell', async () => {
  const sw = await read('web/sw.js');
  const config = await read('web/platform-config.js');
  assert.match(sw, /beyond-the-visa-assets-v88/);
  assert.match(sw, /cache:\s*['"]no-store['"]/);
  assert.match(sw, /skipWaiting/);
  assert.match(sw, /clients\.claim/);
  assert.match(sw, /push/);
  assert.match(config, /sw\.js\?v=88/);
  assert.match(config, /updateViaCache:\s*['"]none['"]/);
});

test('deployable source is free of common mojibake sequences', async () => {
  const files = ['web/index.html', 'web/admin.html', 'web/cbt.html', 'web/cbt.js', 'web/nclex.html', 'web/nclex.js', 'web/sw.js'];
  const bad = /â€|â†|âœ|ðŸ|Ã|Â|ï¿½|�/;
  for (const file of files) assert.doesNotMatch(await read(file), bad, file);
});
