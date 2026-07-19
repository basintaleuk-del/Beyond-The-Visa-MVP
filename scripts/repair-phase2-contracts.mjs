import { readFile, writeFile } from 'node:fs/promises';

async function replace(path, changes) {
  let source = await readFile(path, 'utf8');
  for (const [before, after, label] of changes) {
    if (!source.includes(before)) {
      console.log(`SKIP ${path}: ${label} (already repaired or source moved)`);
      continue;
    }
    source = source.replace(before, after);
    console.log(`FIX  ${path}: ${label}`);
  }
  await writeFile(path, source, 'utf8');
}

await replace('web/platform-upgrade-v72.js', [
  ["{p_user_id:u.id}", "{p_user:u.id}", 'bootstrap RPC parameter'],
  [".order('published_at',{ascending:false}).limit(1)", ".order('created_at',{ascending:false}).limit(1)", 'story ordering'],
  [".eq('active',true).order('position')", ".eq('is_active',true).order('sort_order')", 'journey query'],
  ["d.progress.filter(x=>x.completed_at).length", "d.progress.filter(x=>x.completed===true||Boolean(x.completed_at)).length", 'journey count'],
  ["d.progress.find(x=>x.step_id===s.id)", "d.progress.find(x=>x.step_code===s.code)", 'journey progress lookup'],
  ["${s.position}.", "${s.sort_order}.", 'journey order rendering'],
  ["data-step=\"${s.id}\"", "data-step=\"${s.code}\"", 'journey step code'],
  ["{user_id:d.u.id,step_id:b.dataset.step,completed_at:b.dataset.done==='true'?null:new Date().toISOString()},{onConflict:'user_id,step_id'}", "{user_id:d.u.id,step_code:b.dataset.step,completed:b.dataset.done!=='true',completed_at:b.dataset.done==='true'?null:new Date().toISOString()},{onConflict:'user_id,step_code'}", 'journey upsert contract'],
  [".eq('active',true).order('created_at'", ".eq('status','published').order('created_at'", 'published jobs query'],
  ["j.sponsorship_verified", "j.visa_sponsorship", 'job sponsorship field'],
  [".order('published_at',{ascending:false})", ".order('created_at',{ascending:false})", 'stories list ordering'],
  ["esc(m.display_name)", "esc(m.display_name||m.user_id||'Approved mentor')", 'mentor display fallback'],
  ["esc(m.headline||m.bio)", "esc(m.headline||m.bio||m.biography)", 'mentor biography field'],
]);

await replace('web/dashboard-premium-v73.js', [
  ["x.status==='in_progress'", "x.status==='active'||x.status==='in_progress'", 'active mock status compatibility'],
  ["x.minutes||0} minutes", "Math.round(Number(x.study_seconds||0)/60)} minutes", 'study duration field'],
  ["x.score??0}/${x.total??0", "x.score??0}% · ${x.correct_answers??0}/${x.questions_answered??0}", 'study result fields'],
  ["state.story?.summary||'Explore stories", "state.story?.summary||state.story?.quote||state.story?.story||'Explore stories", 'story summary fallback'],
]);

await replace('web/admin-platform-v72.js', [
  [".order('kind')", ".order('exam_type')", 'mock catalogue ordering'],
  ["x.active", "x.is_active", 'active mock count'],
  ["esc(x.kind)", "esc(x.exam_type)", 'mock exam type'],
  ["x.active?'Active':'Hidden'", "x.is_active?'Active':'Hidden'", 'mock status display'],
  ["x.sponsorship_verified", "x.visa_sponsorship", 'job sponsorship field'],
  ["{p_request_id:b.dataset.refund,p_admin_note:'Approved in platform operations'}", "{p_request_id:b.dataset.refund,p_approve:true}", 'refund RPC arguments'],
]);

await replace('supabase/functions/zibur-gemini/index.ts', [
  ["explain the stored answer and rationale", "explain why the supported option is safest and why alternatives are less appropriate", 'approved Zibur wording'],
]);

console.log('Phase 2 contract repair completed.');
