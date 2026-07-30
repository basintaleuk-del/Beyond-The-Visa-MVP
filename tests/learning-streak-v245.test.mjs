import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL(
    "../supabase/migrations/20260730233000_learning_streak_rankings.sql",
    import.meta.url
  ),
  "utf8"
);
const dashboard = fs.readFileSync(
  new URL("../web/dashboard-premium-v73.js", import.meta.url),
  "utf8"
);
const styles = fs.readFileSync(
  new URL("../web/dashboard-premium-v73.css", import.meta.url),
  "utf8"
);
const desktopImage = fs.statSync(
  new URL("../web/assets/streak/study-streak-nurse-v247.webp", import.meta.url)
);
const compactImage = fs.statSync(
  new URL(
    "../web/assets/streak/study-streak-nurse-v247-960.webp",
    import.meta.url
  )
);

test("streak data is private, server-owned and counted once per UTC day", () => {
  assert.match(migration, /create table if not exists public\.btv_learning_activity_days/i);
  assert.match(migration, /primary key \(user_id, activity_date\)/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /user_id = \(select auth\.uid\(\)\)/i);
  assert.match(
    migration,
    /revoke all on public\.btv_learning_activity_days, public\.btv_learning_streak_profiles\s+from public, anon, authenticated/i
  );
  assert.match(migration, /timezone\('UTC'/i);
});

test("all established free and mock answer paths feed the streak ledger", () => {
  for (const source of [
    "public.cbt_attempts",
    "public.nclex_attempts",
    "public.btv_exam_prep_session_questions",
    "public.btv_exam_attempt_questions",
    "public.btv_numeracy_daily_answers",
    "public.golden_question_attempts",
    "public.btv_study_activity",
  ]) {
    assert.match(migration, new RegExp(source.replaceAll(".", "\\."), "i"));
  }
  assert.match(migration, /after insert or update of answered_at/i);
  assert.match(migration, /accuracy does not affect streak eligibility/i);
});

test("rankings are authenticated and do not expose learner identities", () => {
  assert.match(
    migration,
    /create or replace function public\.btv_learning_streak_summary\(\)/i
  );
  assert.match(migration, /v_user uuid := auth\.uid\(\)/i);
  assert.match(migration, /row_number\(\) over/i);
  assert.match(migration, /'Learner ' \|\| upper\(substr\(md5\(user_id::text\)/i);
  assert.doesNotMatch(migration, /join public\.profiles/i);
  assert.match(
    migration,
    /grant execute on function public\.btv_learning_streak_summary\(\) to authenticated, service_role/i
  );
});

test("study streak opens its own accessible standings experience", () => {
  assert.match(dashboard, /\.rpc\("btv_learning_streak_summary"\)/);
  assert.match(dashboard, /data-streak-open role="button" tabindex="0"/);
  assert.match(dashboard, /function openStudyStreak\(\)/);
  assert.match(dashboard, /LEARNER STANDINGS/);
  assert.match(dashboard, /Free practice and mock answers both count/);
  assert.doesNotMatch(
    dashboard,
    /data-go="analytics"><small>[^<]*Study streak/
  );
  assert.match(styles, /\.studyStreakDialog245/);
  assert.match(styles, /width:min\(1540px,calc\(100vw - 28px\)\)/);
  assert.match(styles, /max-width:none!important;margin:0!important/);
  assert.match(styles, /@media\(min-width:1100px\)/);
  assert.match(styles, /grid-template-areas:\s*"hero standings"\s*"metrics standings"\s*"calendar rule"/);
  assert.match(styles, /study-streak-nurse-v247-960\.webp/);
  assert.match(styles, /study-streak-nurse-v247\.webp/);
  assert.match(styles, /\.streakHero245:before\{[\s\S]*?opacity:\.5/);
  assert.ok(desktopImage.size > 25_000 && desktopImage.size < 100_000);
  assert.ok(compactImage.size > 10_000 && compactImage.size < desktopImage.size);
  assert.match(styles, /@media\(max-width:720px\)/);
  assert.match(styles, /\.streakStat245:focus-visible/);
});
