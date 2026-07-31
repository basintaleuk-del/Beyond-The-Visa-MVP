import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('internal screens create browser history entries and popstate restores the matching screen', () => {
  const navigation = read('web/back-navigation-v108.js');
  const index = read('web/index.html');

  assert.match(index, /back-navigation-v108\.js\?v=267/);
  assert.match(navigation, /HISTORYKEY='btvScreenV267'/);
  assert.match(navigation, /history\.pushState\(\{\[HISTORYKEY\]:true,screen:id,depth\}/);
  assert.match(navigation, /window\.addEventListener\('popstate',restoreBrowserState\)/);
  assert.match(navigation, /openPrevious\(target\)/);
  assert.match(navigation, /if\(current&&Number\(current\.depth\)>0\)\{history\.back\(\);return\}/);
});

test('a direct subpage entry receives an internal home state before the requested screen', () => {
  const navigation = read('web/back-navigation-v108.js');

  assert.match(navigation, /if\(current==='home'\)replaceBrowserState\('home',0\)/);
  assert.match(navigation, /replaceBrowserState\('home',0\);history\.pushState\(\{\[HISTORYKEY\]:true,screen:current,depth:1\}/);
  assert.match(navigation, /history\.go\(-Number\(current\.depth\)\)/);
  assert.match(navigation, /const blocked=new Set\(\['auth'\]\)/);
});
