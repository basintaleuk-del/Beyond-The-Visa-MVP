import { BUCKET, clients, cors, errorResponse, normaliseScript, reply, sha256, stableJson, storageObjectExists, userFromRequest } from '../_shared/ielts-listening-audio.ts';

const MAX_SCRIPT_CHARACTERS = 2000;
const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ success: false, code: 'METHOD_NOT_ALLOWED' }, 405);
  let claimedAssetId = '';
  let claimedRecordingId = '';
  let requestedBy = '';
  try {
    const { user, profile, adminDb } = await userFromRequest(request);
    requestedBy = user.id;
    if (profile.role !== 'admin') throw Object.assign(new Error('Administrator access is required for audio generation.'), { code: 'ADMIN_REQUIRED', status: 403 });
    const body = await request.json();
    const recordingId = String(body.recording_id || '').trim();
    if (!recordingId || body.source_text || body.script || body.dialogue) throw Object.assign(new Error('A recording_id is required; source text is loaded only from the approved IELTS recording.'), { code: 'INVALID_INPUT', status: 400 });

    const { data: recording, error: recordingError } = await adminDb.from('ielts_listening_recordings').select('*').eq('id', recordingId).eq('is_active', true).single();
    if (recordingError || !recording) throw Object.assign(new Error('Active IELTS Listening recording not found.'), { code: 'RECORDING_NOT_FOUND', status: 404 });
    claimedRecordingId = recording.id;
    const dialogue = Array.isArray(recording.dialogue) ? recording.dialogue : [];
    const sourceText = normaliseScript(recording.script || dialogue.map((segment: { text?: string }) => segment.text || '').join('\n'));
    if (!sourceText) throw Object.assign(new Error('The approved recording script is empty.'), { code: 'EMPTY_SCRIPT', status: 422 });
    if (sourceText.length > MAX_SCRIPT_CHARACTERS) throw Object.assign(new Error(`Approved script exceeds the ${MAX_SCRIPT_CHARACTERS}-character dialogue limit.`), { code: 'SCRIPT_TOO_LARGE', status: 422 });
    const version = body.regenerate === true
      ? Number((await adminDb.from('ielts_listening_audio_assets').select('version').eq('recording_id', recording.id).order('version', { ascending: false }).limit(1).maybeSingle()).data?.version || 0) + 1
      : 1;
    const voiceId = dialogue.length > 1 ? 'dialogue' : recording.default_voice_id;
    const hash = await sha256(stableJson({ sourceText, dialogue, voiceId, modelId: recording.model_id, settings: recording.generation_settings, version }));
    const path = `recordings/${recording.id}/${hash}.mp3`;
    const { data: claimRows, error: claimError } = await adminDb.rpc('btv_claim_ielts_listening_audio_generation', {
      p_recording_id: recording.id, p_source_text: sourceText, p_source_text_hash: hash, p_voice_id: voiceId,
      p_model_id: recording.model_id, p_language_code: recording.language_code, p_accent: recording.accent,
      p_generation_settings: recording.generation_settings, p_storage_path: path, p_version: version, p_requested_by: user.id,
    });
    if (claimError) throw claimError;
    const claim = claimRows?.[0];
    if (!claim) throw Object.assign(new Error('Unable to claim audio generation.'), { code: 'GENERATION_CLAIM_FAILED', status: 409 });
    claimedAssetId = claim.asset_id;
    if (claim.claim_state === 'cached') {
      const { data: asset } = await adminDb.from('ielts_listening_audio_assets').select('*').eq('id', claim.asset_id).single();
      if (asset && await storageObjectExists(adminDb, asset.storage_path)) {
        await adminDb.from('ielts_listening_audio_generation_log').insert({ asset_id: asset.id, recording_id: recording.id, requested_by: user.id, cache_hit: true, status: 'completed' });
        return reply({ success: true, source: 'cache', asset_id: asset.id, storage_path: asset.storage_path, duration_seconds: asset.duration_seconds });
      }
      await adminDb.from('ielts_listening_audio_assets').update({ generation_status: 'invalid', generation_error: 'Storage object missing.', is_active: false }).eq('id', claim.asset_id);
      return reply({ success: false, code: 'MISSING_STORAGE_OBJECT', error: 'The cached asset is invalid. Generate a new version.' }, 409);
    }
    if (claim.claim_state === 'pending') {
      for (let attempt = 0; attempt < 8; attempt++) {
        await wait(750);
        const { data: asset } = await adminDb.from('ielts_listening_audio_assets').select('*').eq('id', claim.asset_id).single();
        if (asset?.generation_status === 'completed' && await storageObjectExists(adminDb, asset.storage_path)) return reply({ success: true, source: 'cache', asset_id: asset.id, storage_path: asset.storage_path, duration_seconds: asset.duration_seconds });
        if (asset?.generation_status === 'failed') break;
      }
      return reply({ success: false, code: 'GENERATION_IN_PROGRESS', error: 'Audio generation is already in progress.' }, 202);
    }

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) throw Object.assign(new Error('Audio generation is not configured.'), { code: 'ELEVENLABS_NOT_CONFIGURED', status: 503 });
    const startedAt = Date.now();
    let elevenResponse: Response;
    if (dialogue.length > 1) {
      if (recording.model_id !== 'eleven_v3') throw Object.assign(new Error('Multi-speaker IELTS recordings require the eleven_v3 model.'), { code: 'DIALOGUE_MODEL_REQUIRED', status: 422 });
      const inputs = dialogue.map((segment: { text?: string; voice_id?: string }) => ({ text: normaliseScript(String(segment.text || '')), voice_id: String(segment.voice_id || '') }));
      if (inputs.some((segment: { text: string; voice_id: string }) => !segment.text || !segment.voice_id)) throw Object.assign(new Error('Each approved dialogue segment requires text and a voice_id.'), { code: 'INVALID_DIALOGUE', status: 422 });
      elevenResponse = await fetch('https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128', { method: 'POST', headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ inputs, model_id: recording.model_id }) });
    } else {
      elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(recording.default_voice_id)}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: sourceText, model_id: recording.model_id, voice_settings: recording.generation_settings }) });
    }
    if (!elevenResponse.ok) {
      const upstream = await elevenResponse.text();
      throw Object.assign(new Error('ElevenLabs generation failed.'), { code: elevenResponse.status === 401 ? 'ELEVENLABS_INVALID_KEY' : elevenResponse.status === 429 ? 'ELEVENLABS_RATE_LIMITED' : 'ELEVENLABS_ERROR', status: 502, upstream });
    }
    const audio = new Uint8Array(await elevenResponse.arrayBuffer());
    const { error: uploadError } = await adminDb.storage.from(BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: false });
    if (uploadError) throw Object.assign(new Error('Unable to store generated audio.'), { code: 'STORAGE_UPLOAD_FAILED', status: 502 });
    const { data: completed, error: completeError } = await adminDb.from('ielts_listening_audio_assets').update({ generation_status: 'completed', file_size_bytes: audio.byteLength, generation_error: null, updated_at: new Date().toISOString() }).eq('id', claim.asset_id).select('*').single();
    if (completeError) throw completeError;
    await adminDb.from('ielts_listening_audio_generation_log').insert({ asset_id: completed.id, recording_id: recording.id, requested_by: user.id, cache_hit: false, elevenlabs_request_id: elevenResponse.headers.get('request-id'), character_count: sourceText.length, estimated_credits: sourceText.length, generation_duration_ms: Date.now() - startedAt, status: 'completed' });
    return reply({ success: true, source: 'generated', asset_id: completed.id, storage_path: completed.storage_path, duration_seconds: completed.duration_seconds });
  } catch (error) {
    try {
      const { adminDb } = clients(request);
      if (claimedAssetId) await adminDb.from('ielts_listening_audio_assets').update({ generation_status: 'failed', generation_error: (error as Error).message || 'Unknown error', updated_at: new Date().toISOString() }).eq('id', claimedAssetId);
      if (claimedRecordingId) await adminDb.from('ielts_listening_audio_generation_log').insert({ asset_id: claimedAssetId || null, recording_id: claimedRecordingId, requested_by: requestedBy || null, cache_hit: false, status: 'failed', error: (error as Error).message || 'Unknown error' });
    } catch (_) {}
    return errorResponse(error);
  }
});
