import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('homepage restores the approved premium dashboard theme with guarded fallback rendering', async () => {
  const html = await read('web/index.html');
  assert.equal((html.match(/id=["']home["']/g) || []).length, 1);
  assert.equal((html.match(/id=["']btv-dashboard-v3-script["']/g) || []).length, 1);
  assert.equal((html.match(/window\.renderDashboardInsights\s*=/g) || []).length, 1);
  assert.match(html, /window\.__btvHomeRendererInstalled/);
  assert.match(html, /window\.BTVHomeBoot/);
  assert.match(html, /dashboard-premium-v73\.css\?v=265/);
  assert.match(html, /dashboard-premium-v73\.js\?v=265/);
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

test('homepage replaces the advert placement with a compact social strip', async () => {
  const [dashboard, css] = await Promise.all([
    read('web/dashboard-premium-v73.js'),
    read('web/dashboard-premium-v73.css'),
  ]);
  assert.match(dashboard, /data-home-social-slot="sidebar"/);
  assert.match(dashboard, />Connect with us</);
  assert.match(css, /\.sidebarConnect262\{/);
  assert.match(dashboard, /data-home-social-slot="mobile-menu"/);
  assert.match(dashboard, /drawerMenu73[\s\S]*drawerConnect262/);
  assert.match(css, /\.drawerConnect262\{display:none\}/);
  assert.match(css, /@media\(max-width:1090px\)[\s\S]*\.drawerConnect262\{display:block/);
  assert.doesNotMatch(dashboard, /Your campaign here|Place an advert|data-home-ad-slot/);
  assert.doesNotMatch(css, /sidebarAdvert73|drawerAdvert73/);
  assert.doesNotMatch(dashboard, /sidebarLondon73/);
  assert.doesNotMatch(css, /sidebar-london-bridge-v101\.png|sidebarLondon73/);
});

test('campaign placements contain the four compact social destinations', async () => {
  const [dashboard, css] = await Promise.all([
    read('web/dashboard-premium-v73.js'),
    read('web/dashboard-premium-v73.css'),
  ]);
  assert.match(dashboard, /socialLinksMarkup\(\)/);
  assert.match(dashboard, /href="https:\/\/www\.facebook\.com\/share\/1JsB8W8Wtg\/\?mibextid=wwXIfr"/);
  assert.match(dashboard, /href="https:\/\/www\.tiktok\.com\/@beyond_the_visa\?_r=1&amp;_t=ZN-98V2UDlDXD4"/);
  assert.match(dashboard, /href="https:\/\/www\.instagram\.com\/beyondthevisa_official\?igsh=eTlraTNjdnNpdWwy&amp;utm_source=qr"/);
  assert.match(dashboard, /href="https:\/\/wa\.me\/447723126429\?text=Hello%20Beyond%20the%20Visa%2C%20I%20found%20your%20contact%20through%20your%20website%20and%20would%20like%20to%20make%20an%20enquiry\."/);
  assert.equal((dashboard.match(/target="_blank" rel="noopener noreferrer" aria-label=/g) || []).length, 4);
  assert.match(dashboard, /@beyond_the_visa/);
  assert.match(dashboard, /@beyondthevisa_official/);
  assert.match(dashboard, /\+44 7723 126429/);
  assert.match(dashboard, /aria-label="Message Beyond the Visa on WhatsApp"/);
  assert.equal((dashboard.match(/class="socialArrow264"/g) || []).length, 4);
  assert.match(css, /\.sidebarSocialStrip262\{position:static;inset:auto;z-index:auto;width:auto;display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(dashboard, /<div class="sidebarSocialStrip262" role="navigation"/);
  assert.doesNotMatch(dashboard, /<nav class="sidebarSocialStrip262"/);
  assert.match(css, /\.sidebarSocialStrip262>a:focus-visible/);
  assert.match(css, /\.sidebarConnect262\{[^}]*min-height:156px/);
  assert.match(css, /min-height:54px/);
  assert.match(css, /connect-global-nurses-480\.webp/);
  assert.match(css, /connect-global-nurses-960\.webp/);
  assert.match(css, /background-position:center right/);
  assert.match(css, /\.drawerConnect262\{[^}]*background-position:66% center/);
  assert.match(css, /\.drawerConnect262 \.sidebarSocialStrip262\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(css, /@media\(max-width:340px\)\{\.drawerConnect262 \.sidebarSocialStrip262\{grid-template-columns:1fr\}/);
  assert.doesNotMatch(css, /\.sidebarSocialStrip262 small\{[^}]*text-overflow:ellipsis/);
});

test('connect tile artwork is compressed for responsive delivery', async () => {
  const [small, large] = await Promise.all([
    stat(new URL('../web/assets/social/connect-global-nurses-480.webp', import.meta.url)),
    stat(new URL('../web/assets/social/connect-global-nurses-960.webp', import.meta.url)),
  ]);
  assert.ok(small.size < 25000, `480px artwork is ${small.size} bytes`);
  assert.ok(large.size < 60000, `960px artwork is ${large.size} bytes`);
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
