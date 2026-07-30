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
  assert.match(html, /dashboard-premium-v73\.css\?v=247/);
  assert.match(html, /dashboard-premium-v73\.js\?v=245/);
  assert.doesNotMatch(html, /experience-v30\.7\.js|recovery-v63\.js|dashboard-reference-v74\.js|mission-control-v76\.js/);
  assert.doesNotMatch(html, /setTimeout\s*\(\s*window\.renderDashboardInsights/);
});

test('homepage replaces plan text with the selected destination flag', async () => {
  const [html, dashboard, css] = await Promise.all([
    read('web/index.html'),
    read('web/dashboard-premium-v73.js'),
    read('web/dashboard-premium-v73.css'),
  ]);
  assert.doesNotMatch(dashboard, /PREMIUM PLAN/);
  assert.doesNotMatch(html, /\$\{esc\(plan\)\} PLAN/);
  assert.match(dashboard, /destinationFlagBadge73/);
  assert.match(dashboard, /destination\.flagCode/);
  assert.match(dashboard, /flagcdn\.com\/w80/);
  assert.match(dashboard, /Selected destination:/);
  assert.match(html, /class="planBadge destinationFlagBadge"/);
  assert.match(html, /flagCode/);
  assert.match(css, /\.destinationFlagBadge73/);

  const start = dashboard.indexOf('function destinationInfo()');
  const end = dashboard.indexOf('function safeName', start);
  const destinationSource = dashboard.slice(start, end);
  assert.ok(destinationSource.indexOf('profile.destination_country') < destinationSource.indexOf('selected?.name'));
  for (const [key, name] of [
    ['uk', 'United Kingdom'],
    ['us', 'United States'],
    ['au', 'Australia'],
    ['ca', 'Canada'],
    ['nz', 'New Zealand'],
    ['ie', 'Ireland'],
    ['ae', 'United Arab Emirates'],
    ['sa', 'Saudi Arabia'],
  ]) {
    assert.match(destinationSource, new RegExp(`${key}: \\{ name: "${name}"`));
  }
});

test('homepage sidebar uses a compact advert placement instead of London artwork', async () => {
  const [dashboard, css] = await Promise.all([
    read('web/dashboard-premium-v73.js'),
    read('web/dashboard-premium-v73.css'),
  ]);
  assert.match(dashboard, /data-home-ad-slot="sidebar"/);
  assert.match(dashboard, /data-go="help-support">Place an advert/);
  assert.match(css, /\.sidebarAdvert73\{/);
  assert.match(dashboard, /data-home-ad-slot="mobile-menu"/);
  assert.match(dashboard, /drawerMenu73[\s\S]*drawerAdvert73/);
  assert.match(css, /\.drawerAdvert73\{display:none\}/);
  assert.match(css, /@media\(max-width:1090px\)[\s\S]*\.drawerAdvert73\{display:block/);
  assert.match(css, /\.drawerAdvert73>button\{min-height:44px/);
  assert.doesNotMatch(dashboard, /sidebarLondon73/);
  assert.doesNotMatch(css, /sidebar-london-bridge-v101\.png|sidebarLondon73/);
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
