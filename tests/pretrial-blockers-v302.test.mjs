import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const config = JSON.parse(read('vercel.json'));
const canonical = 'https://beyondthevisa.org';
const approvedHosts = ['beyondthevisa.org', 'www.beyondthevisa.org', 'beyondthevisa.uk', 'www.beyondthevisa.uk'];

test('every approved hostname serves the same deployment without a cross-domain redirect', () => {
  for (const host of approvedHosts) {
    assert.equal(
      config.redirects.some((item) => item.has?.some((condition) => condition.type === 'host' && condition.value === host)),
      false,
      `${host} must keep its own origin so first-party assets remain CSP self`,
    );
  }
});

test('application shell assets remain local to the active origin', () => {
  const html = read('web/index.html');
  const assets = ['supabase-client.js', 'platform-config.js', 'platform-v30.js', 'navigation-state-v63.js', 'login-brand-v64.js', 'profile-persistence-v266.js', 'mobile-jobs-nav-v157.js', 'social-auth-v69.js', 'storage-v21.js', 'edge-functions-v22.js', 'contact-safety-v176.js', 'manager-inbox-v26.js', 'premium-v29.js', 'release-v33.js', 'admin-launcher.js', 'zibur-professional-v199.js', 'help-support-v210.js'];
  assert.doesNotMatch(html, /(?:src|href)=["']https:\/\/(?:www\.)?beyondthevisa\.(?:org|uk)\//);
  for (const asset of assets) assert.match(html, new RegExp(`(?:src|href)=["']\\/?${asset.replaceAll('.', '\\.')}(?:\\?[^"']*)?["']`));
});

test('canonical metadata, sitemap and robots agree on the apex origin', () => {
  const html = read('index.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/beyondthevisa\.org\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/beyondthevisa\.org\/">/);
  assert.match(read('robots.txt'), /Sitemap: https:\/\/beyondthevisa\.org\/sitemap\.xml/);
  assert.doesNotMatch(read('sitemap-pages.xml'), /https:\/\/(?:www\.)?beyondthevisa\.uk/);
  assert.doesNotMatch(read('sitemap-pages.xml'), /https:\/\/www\.beyondthevisa\.org/);
});

test('signed-out auth renders before authenticated assets and videos do not preload', () => {
  const html = read('web/index.html');
  assert.ok(html.indexOf('social-auth-v69.js?v=303') < html.indexOf('storage-v21.js'));
  assert.equal((html.match(/auth-redesign-v69\.css\?v=303/g) || []).length, 1);
  assert.equal((html.match(/social-auth-v69\.js\?v=303/g) || []).length, 1);
  assert.doesNotMatch(html, /<link rel="stylesheet" href="(?!(?:auth-redesign-v69|release-v71|v71-feature-merge-v82)\.css)[^"]+">/);
  assert.match(html, /forgotPassword'\)\|\|document\.getElementById\('forgotPasswordV69/);
  assert.match(read('web/welcome-video-v82.js'), /preload="none"/);
  assert.match(read('web/release-v66.js'), /preload="none"/);
  assert.match(read('web/social-auth-v69.js'), /favicon-512-v281\.webp\?v=302/);
  assert.match(html, /\.btv-boot body\{display:none!important\}/);
});

test('Preview isolation fails closed for production resources and passes isolated test resources', () => {
  const productionService = 'production-service-role-example';
  const productionPaystack = 'sk_live_example';
  const baseEnv = {
    ...process.env,
    VERCEL_ENV: 'preview',
    SUPABASE_URL: 'https://previewrefexample.supabase.co',
    SUPABASE_ANON_KEY: 'preview-anon',
    SUPABASE_SERVICE_ROLE_KEY: 'preview-service-role',
    CRON_SECRET: 'preview-cron',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'preview-vapid-public',
    VAPID_PRIVATE_KEY: 'preview-vapid-private',
    PAYSTACK_SECRET_KEY: 'sk_test_example',
    APP_URL: 'https://fix-pretrial-blockers.example.vercel.app',
    BTV_PRODUCTION_SERVICE_ROLE_SHA256: createHash('sha256').update(productionService).digest('hex'),
    BTV_PRODUCTION_PAYSTACK_SECRET_SHA256: createHash('sha256').update(productionPaystack).digest('hex')
  };
  const run = (env) => spawnSync(process.execPath, ['scripts/validate-preview-isolation-v302.mjs'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(run(baseEnv).status, 0);
  assert.notEqual(run({ ...baseEnv, SUPABASE_URL: 'https://wuvgktmzkzrdvbpqfmek.supabase.co' }).status, 0);
  assert.notEqual(run({ ...baseEnv, PAYSTACK_SECRET_KEY: productionPaystack }).status, 0);
  assert.notEqual(run({ ...baseEnv, SUPABASE_SERVICE_ROLE_KEY: productionService }).status, 0);
  assert.notEqual(run({ ...baseEnv, APP_URL: 'https://beyondthevisa.org' }).status, 0);
});
