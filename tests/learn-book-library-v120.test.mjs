import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');

test('legacy Book library text button is removed from the modern Learn page',()=>{
  const legacy=read('web/release-v66.js'),cleanup=read('web/learn-book-library-v120.js');
  assert.match(legacy,/learn\.querySelector\('\[data-module="books"\]'\)/);
  assert.match(legacy,/legacy\?\.remove\(\)/);
  assert.match(legacy,/if\(!target\)return/);
  assert.doesNotMatch(legacy,/querySelector\('\.learnCards,\.quick,\.premiumLibraryGrid'\)\|\|learn/);
  assert.match(cleanup,/querySelectorAll\('\[data-btv-books\]'\)/);
  assert.match(read('web/index.html'),/learn-book-library-v120\.js\?v=120/);
});

test('Learn Book library keeps published books and signed storage access',()=>{
  const learn=read('web/learn-v90.js');
  assert.match(learn,/id:'books',label:'Book library'/);
  assert.match(learn,/from\('books'\)\.select\('\*'\)\.eq\('status','published'\)/);
  assert.match(learn,/storage\.from\('btv-books'\)\.createSignedUrl/);
  assert.match(learn,/if\(e\.detail\?\.id==='books'\)setTimeout\(openBooks,80\)/);
  assert.doesNotMatch(learn,/id==='explore'\|\|e\.detail\?\.id==='books'/);
});
