import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const social=fs.readFileSync(path.join(root,'web/social-auth-v69.js'),'utf8');
const callback=fs.readFileSync(path.join(root,'web/auth-callback.html'),'utf8');
const localCallback=fs.readFileSync(path.join(root,'web/auth/callback/index.html'),'utf8');
const index=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'web/auth-redesign-v69.css'),'utf8');
const vercel=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));

test('Facebook is added beside Google without replacing existing auth methods',()=>{
  assert.match(social,/id="googleAuthV69"/);
  assert.match(social,/id="facebookAuthV274"/);
  assert.match(social,/socialSignIn\('google'/);
  assert.match(social,/socialSignIn\('facebook'/);
  assert.match(index,/signInWithPassword/);
  assert.match(index,/auth\.signUp/);
  assert.match(css,/\.facebookAuth/);
  assert.match(index,/auth-redesign-v69\.css\?v=302/);
  assert.match(index,/social-auth-v69\.js\?v=302/);
});

test('Facebook OAuth uses the shared Supabase client and dedicated callback',()=>{
  assert.match(social,/window\.btvSupabase\.auth\.signInWithOAuth/);
  assert.match(social,/provider,/);
  assert.match(social,/isFacebook\s*\? `\$\{window\.location\.origin\}\/auth\/callback`/);
  assert.match(social,/: `\$\{location\.origin\}\$\{location\.pathname\}\$\{location\.search\}`/);
  assert.ok(vercel.rewrites.some(rule=>rule.source==='/auth/callback'&&rule.destination==='/auth-callback.html'));
});

test('callback handles cancellation, errors, expiry and safe return paths',()=>{
  assert.match(callback,/access_denied/);
  assert.match(callback,/sign-in session has expired/);
  assert.match(callback,/getSession\(\)/);
  assert.match(callback,/exchangeCodeForSession\(code\)/);
  assert.match(callback,/url\.origin!==location\.origin/);
  assert.match(callback,/sessionStorage\.getItem\(returnKey\)/);
  assert.match(localCallback,/\/auth-callback\.html\$\{location\.search\}\$\{location\.hash\}/);
});

test('OAuth users retain onboarding and available profile fields',()=>{
  assert.match(index,/user\.user_metadata\?\.avatar_url\|\|user\.user_metadata\?\.picture/);
  assert.match(index,/if\(!session\.user\.email\)/);
  assert.match(index,/userProfile\(\)\?await showApp\(\):showOnboarding\(\)/);
  assert.match(callback,/from\('profiles'\)\.select\('full_name'\)/);
  assert.match(callback,/btv-profile-extra:/);
});
