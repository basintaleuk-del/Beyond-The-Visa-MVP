import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(path, 'utf8');
const migration = read('supabase/migrations/202607250001_ielts_listening_elevenlabs_audio.sql');
const generate = read('supabase/functions/generate-ielts-listening-audio/index.ts');
const playback = read('supabase/functions/get-ielts-listening-audio/index.ts');

test('IELTS Listening audio has a private, versioned cache schema', () => {
  assert.match(migration, /create table if not exists public\.ielts_listening_recordings/i);
  assert.match(migration, /create table if not exists public\.ielts_listening_audio_assets/i);
  assert.match(migration, /ielts-listening-audio/);
  assert.match(migration, /public=false/);
  assert.match(migration, /recording_id, source_text_hash, voice_id, model_id, version/);
  assert.match(migration, /btv_claim_ielts_listening_audio_generation/);
  assert.match(migration, /btv_publish_ielts_listening_audio_asset/);
});

test('generation is admin-only and never trusts browser supplied text', () => {
  assert.match(generate, /profile\.role !== 'admin'/);
  assert.match(generate, /body\.source_text \|\| body\.script \|\| body\.dialogue/);
  assert.match(generate, /from\('ielts_listening_recordings'\)/);
  assert.match(generate, /Deno\.env\.get\('ELEVENLABS_API_KEY'\)/);
  assert.match(generate, /text-to-dialogue/);
  assert.match(generate, /text-to-speech/);
  assert.match(generate, /storage\.from\(BUCKET\)\.upload/);
});

test('learner playback serves only approved assets through signed URLs', () => {
  assert.match(playback, /is_approved', true/);
  assert.match(playback, /createSignedUrl/);
  assert.match(playback, /AUDIO_ACCESS_DENIED/);
  assert.doesNotMatch(playback, /ELEVENLABS_API_KEY/);
});

test('only the IELTS Listening web path invokes audio playback', () => {
  const learner = read('web/ielts-listening-audio-v125.js');
  const admin = read('web/admin-ielts-listening-audio-v125.js');
  const files = ['web/cbt.js', 'web/nclex.js'].map(path => ({ path, content: readFileSync(path, 'utf8') }));
  assert.match(learner, /get-ielts-listening-audio/);
  assert.match(admin, /generate-ielts-listening-audio/);
  for (const file of files) assert.doesNotMatch(file.content, /elevenlabs|ielts-listening-audio/i, file.path);
});

test('Listening requires readiness, instruction audio, and single-play audio-only test playback', () => {
  const learner = read('web/ielts-listening-audio-v125.js');
  assert.match(learner, /ielts-listening-test-instructions/);
  assert.match(learner, /Are you ready for your IELTS Listening test/);
  assert.match(learner, /Start my listening test/);
  assert.match(learner, /audio\.onended/);
  assert.match(learner, /ieltsAudioOnlyOverlay/);
  assert.doesNotMatch(learner, /<audio[^>]*controls/i);
});
