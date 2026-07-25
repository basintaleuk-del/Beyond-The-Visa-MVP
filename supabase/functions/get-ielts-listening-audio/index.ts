import { BUCKET, cors, errorResponse, reply, storageObjectExists, userFromRequest } from '../_shared/ielts-listening-audio.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ success: false, code: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const { profile, adminDb } = await userFromRequest(request);
    const body = await request.json();
    const recordingCode = String(body.recording_code || '').trim();
    const recordingId = String(body.recording_id || '').trim();
    if ((!recordingCode && !recordingId) || body.source_text || body.script) throw Object.assign(new Error('An IELTS Listening recording identifier is required.'), { code: 'INVALID_INPUT', status: 400 });
    let recordingQuery = adminDb.from('ielts_listening_recordings').select('id,access_level').eq('is_active', true);
    recordingQuery = recordingId ? recordingQuery.eq('id', recordingId) : recordingQuery.eq('recording_code', recordingCode);
    const { data: recording, error: recordingError } = await recordingQuery.single();
    if (recordingError || !recording) throw Object.assign(new Error('IELTS Listening recording not found.'), { code: 'RECORDING_NOT_FOUND', status: 404 });
    const isAdmin = profile.role === 'admin';
    if (!isAdmin && recording.access_level === 'premium' && profile.account_type !== 'premium') throw Object.assign(new Error('You do not have access to this IELTS Listening recording.'), { code: 'AUDIO_ACCESS_DENIED', status: 403 });
    let assetQuery = adminDb.from('ielts_listening_audio_assets').select('*').eq('recording_id', recording.id).eq('generation_status', 'completed').order('created_at', { ascending: false }).limit(1);
    if (!isAdmin) assetQuery = assetQuery.eq('is_approved', true).eq('is_active', true);
    const { data: assets, error: assetError } = await assetQuery;
    const asset = assets?.[0];
    if (assetError || !asset) return reply({ success: false, code: 'AUDIO_UNAVAILABLE', error: 'Approved audio is not available yet.' }, 404);
    if (!await storageObjectExists(adminDb, asset.storage_path)) {
      await adminDb.from('ielts_listening_audio_assets').update({ generation_status: 'invalid', generation_error: 'Storage object missing.', is_active: false }).eq('id', asset.id);
      return reply({ success: false, code: 'AUDIO_UNAVAILABLE', error: 'Approved audio is temporarily unavailable.' }, 404);
    }
    const { data: signed, error: signedError } = await adminDb.storage.from(BUCKET).createSignedUrl(asset.storage_path, 60 * 15);
    if (signedError || !signed?.signedUrl) throw Object.assign(new Error('Playback URL could not be created.'), { code: 'SIGNED_URL_FAILED', status: 502 });
    return reply({ success: true, asset_id: asset.id, storage_path: asset.storage_path, playback_url: signed.signedUrl, duration_seconds: asset.duration_seconds });
  } catch (error) { return errorResponse(error); }
});
