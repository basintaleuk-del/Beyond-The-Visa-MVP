import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const nclex=read('web/nclex.html');
const nclexController=read('web/nclex.js');
const ielts=read('web/ielts.html');
const ieltsController=read('web/ielts-centre-v103.js');
const osce=read('web/osce.html');
const osceController=read('web/learning-centres-v103.js');
const css=read('web/learning-hubs-v197.css');

test('NCLEX IELTS and OSCE load the shared premium learning hub design',()=>{
  for(const page of [nclex,ielts,osce]) assert.match(page,/learning-hubs-v197\.css\?v=197/);
  assert.match(nclex,/YOUR NCLEX LEARNING HUB/);
  assert.match(ieltsController,/YOUR IELTS ACADEMIC HUB/);
  assert.match(osceController,/YOUR UK OSCE LEARNING HUB/);
  assert.match(nclex,/Independent educational content/);
  assert.match(ieltsController,/Independent educational content/);
  assert.match(osceController,/Independent educational content/);
})

test('each hub uses distinct responsive nurse photography with dimensions and alt text',()=>{
  const entries=[['nclex',nclex],['ielts',ieltsController],['osce',osceController]];
  for(const [name,source] of entries){
    assert.match(source,new RegExp(`${name}-learning-hero-v197\\.webp`));
    assert.match(source,new RegExp(`${name}-learning-hero-v197-720\\.webp`));
    assert.match(source,/width="1600" height="900"/);
    assert.match(source,/alt="Professional|alt="Caribbean/);
    for(const suffix of ['.webp','-720.webp']){
      const size=fs.statSync(path.join(root,`web/${name}-learning-hero-v197${suffix}`)).size;
      assert.ok(size<120_000,`${name}${suffix} should stay below 120 KB`);
    }
  }
})

test('hub actions preserve existing practice routes and responsive behaviour',()=>{
  assert.match(nclex,/data-view="practice"/);
  assert.match(nclexController,/querySelectorAll\('\[data-view\]'\)/);
  assert.match(ieltsController,/data-ielts-section="reading"/);
  assert.match(ieltsController,/data-ielts-section="writing"/);
  assert.match(osceController,/data-jump="stations"/);
  assert.match(osceController,/data-jump="osceResources"/);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/min-height:46px/);
})
