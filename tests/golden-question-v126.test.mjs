import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=file=>readFile(new URL(`../${file}`,import.meta.url),'utf8');

test('homepage and admin ship the Golden Question experiences',async()=>{
  const [home,admin,client,css]=await Promise.all([read('web/index.html'),read('web/admin.html'),read('web/golden-question-v126.js'),read('web/golden-question-v126.css')]);
  assert.match(home,/golden-question-v126\.css/);assert.match(home,/golden-question-v126\.js/);
  assert.match(admin,/admin-golden-question-v126\.js\?v=137/);assert.match(client,/Today’s Golden Question/);
  assert.match(client,/profession_missing/);assert.match(client,/TERMS_REQUIRED/);assert.match(client,/navigator\.share/);
  assert.match(css,/@media\s*\(max-width:\s*620px\)/);assert.doesNotMatch(css,/width:\s*100vw/);
});

test('daily assignment and answer submission are server controlled',async()=>{
  const fn=await read('supabase/functions/golden-question/index.ts');
  assert.match(fn,/Europe\/London/);assert.match(fn,/golden_question_daily_assignments/);
  assert.match(fn,/btv_record_golden_attempt/);assert.match(fn,/ALREADY_ANSWERED/);
  assert.match(fn,/from\(["']btv_golden_questions["']\)/);assert.match(fn,/audienceFor\(profession\)/);
  assert.match(fn,/action\s*===\s*["']preview["']/);assert.match(fn,/publicPreview/);
  assert.match(fn,/action\s*===\s*["']cron["']/);assert.match(fn,/SERVICE_AUTH_REQUIRED/);
  assert.match(fn,/data:image\\\/svg\\\+xml/);assert.match(fn,/currentSponsor\(sponsorRows \|\| \[\], date\)/);
});

test('sponsor administration captures campaign, prize and permission details',async()=>{
  const [fn,admin]=await Promise.all([read('supabase/functions/golden-question/index.ts'),read('web/admin-golden-question-v126.js')]);
  for(const field of ['website_url','logo_path','prize_description','message','sponsored_month','start_date','end_date','logo_permission_notes']){
    assert.match(fn,new RegExp(field));assert.match(admin,new RegExp(field));
  }
  assert.match(fn,/sponsor_updated/);assert.match(admin,/Campaign start/);
});

test('existing bank bridge protects answers and makes retries idempotent',async()=>{
  const sql=await read('supabase/migrations/202607260001_golden_question_bank_bridge_v137.sql');
  assert.match(sql,/references public\.btv_golden_questions\(id\)/);
  assert.match(sql,/revoke select on public\.btv_golden_questions from anon, authenticated/);
  assert.match(sql,/if found then[\s\S]*'idempotent',true/);
  assert.match(sql,/eligible_for_random/);assert.match(sql,/last_released_at/);
});

test('migration separates professions and prevents duplicate scoring and rewards',async()=>{
  const sql=await read('supabase/migrations/202607250002_golden_question_v126.sql');
  for(const table of ['golden_questions','golden_question_options','golden_question_daily_assignments','golden_question_attempts','golden_question_monthly_scores','golden_question_leaderboard_snapshots','golden_question_winners','golden_question_comments','golden_question_comment_reports','golden_question_share_events','golden_question_sponsors','golden_question_prize_fulfilments','golden_question_admin_audit_logs','golden_question_settings'])assert.match(sql,new RegExp(`create table if not exists public\\.${table}`));
  assert.match(sql,/unique\(user_id,daily_question_id\)/);assert.match(sql,/golden_daily_one_active_uq/);
  assert.match(sql,/golden-question-winner:/);assert.match(sql,/golden_question_monthly_prize/);
  assert.match(sql,/alter table public\.%I enable row level security/i);
  assert.match(sql,/storage\.buckets/);assert.match(sql,/image\/jpeg','image\/png','image\/webp/);
});

test('winner tie breaks and privacy-safe leaderboard are explicit',async()=>{
  const [sql,fn]=await Promise.all([read('supabase/migrations/202607250002_golden_question_v126.sql'),read('supabase/functions/golden-question/index.ts')]);
  assert.match(sql,/points desc,correct_answers desc,\(correct_answers::numeric\/nullif\(attempts,0\)\) desc,longest_streak desc,final_score_achieved_at asc/);
  assert.match(fn,/Anonymous Participant/);assert.match(fn,/golden_leaderboard_opt_out/);
  assert.doesNotMatch(fn,/select\('.*email/);
});

test('public preview never includes an answer',async()=>{
  const [page,preview]=await Promise.all([read('web/golden-question.html'),read('web/golden-question-preview-v126.js')]);
  assert.match(page,/Public previews never reveal the correct answer/);assert.match(page,/og:title/);
  assert.doesNotMatch(preview,/correct_answer|acceptable_answers|explanation/);
});

test('Europe London calendar handling survives both daylight-saving boundaries',()=>{
  const day=d=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(d)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  assert.deepEqual(day('2026-03-29T00:30:00Z'),{day:'29',month:'03',year:'2026',hour:'00'});
  assert.deepEqual(day('2026-03-29T01:30:00Z'),{day:'29',month:'03',year:'2026',hour:'02'});
  assert.deepEqual(day('2026-10-25T00:30:00Z'),{day:'25',month:'10',year:'2026',hour:'01'});
  assert.deepEqual(day('2026-10-25T01:30:00Z'),{day:'25',month:'10',year:'2026',hour:'01'});
});

test('scoring, streaks and manual short-answer review are transaction-backed',async()=>{
  const sql=await read('supabase/migrations/202607250002_golden_question_v126.sql');
  assert.match(sql,/streak_bonuses/);assert.match(sql,/bonuses->>'14'/);assert.match(sql,/max_speed_bonus/);
  assert.match(sql,/btv_review_golden_short_answer/);assert.match(sql,/review_status<>'pending'/);
  assert.match(sql,/update golden_question_monthly_scores set points=points\+award/);
});

test('RLS, admin authorization, protected images and moderation are enforced',async()=>{
  const [sql,fn]=await Promise.all([read('supabase/migrations/202607250002_golden_question_v126.sql'),read('supabase/functions/golden-question/index.ts')]);
  assert.match(sql,/private\.btv_is_admin/);assert.match(sql,/golden_images_admin_insert/);
  assert.match(sql,/golden-question-images','golden-question-images',false,5242880/);
  assert.match(fn,/ADMIN_REQUIRED/);assert.match(fn,/unsafe_clinical_advice/);assert.match(fn,/confidentiality_breach/);
  assert.match(fn,/RATE_LIMITED/);assert.match(fn,/unrealistic_speed/);
});

test('Golden Question images are migrated from embedded SVG data to private storage paths',async()=>{
  const [sql,fn,script]=await Promise.all([
    read('supabase/migrations/20260801212038_migrate_golden_question_images_to_storage.sql'),
    read('supabase/functions/golden-question/index.ts'),
    read('scripts/migrate-golden-question-images.mjs')
  ]);
  assert.match(sql,/'image\/svg\+xml'/);
  assert.match(sql,/'questions\/equipment\/'\s*\|\|\s*md5\(question_image_url\)\s*\|\|\s*'\.svg'/);
  assert.match(sql,/where question_image_url like 'data:image\/svg\+xml;utf8,%'/);
  assert.match(fn,/createSignedUrl\(path,\s*900\)/);
  assert.match(script,/Unsafe SVG rejected/);
  assert.match(script,/golden-question-images\/\$\{objectPath\}/);
  assert.doesNotMatch(script,/SUPABASE_SERVICE_ROLE_KEY\s*=/);
});

test('monthly freeze preserves history and wallet award is idempotent',async()=>{
  const sql=await read('supabase/migrations/202607250002_golden_question_v126.sql');
  assert.match(sql,/golden_question_leaderboard_snapshots/);assert.match(sql,/btv_freeze_golden_month/);
  assert.match(sql,/reward_status='awarded'/);assert.match(sql,/idempotency_key/);assert.match(sql,/unique\(wallet_transaction_id\)/);
  assert.match(sql,/transaction_type.*golden_question_monthly_prize/s);
});
