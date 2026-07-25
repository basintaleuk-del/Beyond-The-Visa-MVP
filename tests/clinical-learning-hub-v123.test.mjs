import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('catalog registers ten on-demand textbook modules without claiming clinical review',()=>{
  const context={window:{}};
  vm.runInNewContext(read('web/clinical-catalog-v123.js'),context);
  const detailed=context.window.BTVClinicalCatalog.filter(module=>module.detailPath);
  assert.equal(detailed.length,10);
  assert.ok(detailed.every(module=>module.clinicalReviewStatus==='awaiting_clinical_review'));
  assert.ok(detailed.every(module=>module.detailPath.startsWith('clinical-modules-v123/')));
});

test('priority clinical modules meet the structured textbook baseline',()=>{
  const directory=path.join(root,'web','clinical-modules-v123');
  const files=fs.readdirSync(directory).filter(file=>file.endsWith('.json'));
  assert.equal(files.length,10);
  for(const file of files){
    const module=JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));
    assert.equal(module.sections.length,19,`${file} section count`);
    assert.equal(module.caseStudies.length,2,`${file} case study count`);
    assert.equal(module.knowledgeChecks.length,7,`${file} knowledge check count`);
    assert.ok(module.references.length>=3,`${file} references`);
    assert.equal(module.clinicalReviewStatus,'awaiting_clinical_review');
    assert.equal(module.reviewedBy,null);
  }
});

test('clinical route loads the catalog, modal hub and styles while preserving the OSCE controller',()=>{
  const html=read('web/adult-nursing.html');
  assert.match(html,/clinical-learning-hub-v123\.css/);
  assert.match(html,/clinical-catalog-v123\.js/);
  assert.match(html,/clinical-learning-hub-v123\.js/);
  assert.match(html,/<base href="\/">/);
  const controller=read('web/learning-centres-v103.js');
  assert.match(controller,/learningCentre==='osce'\)\{renderOsce\(\);return\}/);
  assert.match(controller,/window\.BTVClinicalHub\.init\(\)/);
});

test('modal accessibility and completion require sections and checks',()=>{
  const hub=read('web/clinical-learning-hub-v123.js');
  assert.match(hub,/dialog\.showModal\(\)/);
  assert.match(hub,/event\.key==='Escape'/);
  assert.match(hub,/event\.key!=='Tab'/);
  assert.match(hub,/state\.opener\?\.focus/);
  assert.match(hub,/missingSections\.length\|\|missingChecks\.length/);
  assert.doesNotMatch(hub,/completed_at.*recordOpen/);
});

test('direct module URLs rewrite to the authenticated clinical route',()=>{
  const config=JSON.parse(read('vercel.json'));
  assert.ok(config.rewrites.some(rule=>rule.source==='/clinical-learning/:slug'&&rule.destination==='/adult-nursing.html'));
});

test('migration isolates learner records and enforces clinical governance',()=>{
  const sql=read('supabase/migrations/202607240017_clinical_learning_hub_v123.sql');
  for(const table of ['btv_clinical_modules','btv_clinical_module_versions','btv_clinical_progress','btv_clinical_bookmarks','btv_clinical_notes','btv_clinical_check_attempts'])assert.match(sql,new RegExp(`create table if not exists public\\.${table}`));
  assert.match(sql,/clinical_review_status <> 'clinically_reviewed'/);
  assert.match(sql,/reviewer_name is not null and reviewer_role is not null and reviewed_at is not null/);
  assert.match(sql,/auth\.uid\(\) = user_id/);
  assert.match(sql,/public\.btv_is_admin\(\)/);
});

test('admin editor exposes review, publication, preview and history workflows',()=>{
  const admin=read('web/admin-clinical-modules-v123.js');
  for(const marker of ['awaiting_clinical_review','clinically_reviewed','Submit for review','Publish','Unpublish','Archive','Preview JSON','Version and change history'])assert.match(admin,new RegExp(marker));
  assert.match(admin,/Clinically reviewed modules require reviewer name, role and review date/);
});
