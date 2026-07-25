# IELTS Listening ElevenLabs audio

This pipeline is intentionally restricted to IELTS Listening recordings. It must not be reused by CBT, NCLEX, OSCE, Zibur, clinical learning, or any general narration feature.

## Deploy

1. Apply `supabase/migrations/202607250001_ielts_listening_elevenlabs_audio.sql`.
2. Set `ELEVENLABS_API_KEY` as a Supabase Edge Function secret. Do not add it to browser variables, repository files, or deployment output.
3. Deploy `generate-ielts-listening-audio` and `get-ielts-listening-audio`.
4. In the existing admin portal, open **IELTS Listening Audio**, generate and approve the seeded **IELTS Listening test instructions** recording first. It is reused for every learner's readiness flow.
5. Add each approved listening recording script and voice ID, generate a draft, preview it, then approve it.

The recording code should match the static listening set code when attaching audio to the current practice bank, for example `listening-set-01`. During playback, the screen is blank and no pause, replay, or visible audio controls are shown; questions appear only when the recording ends.

## Security and lifecycle

- Generation is admin-only and the Edge Function loads scripts from `ielts_listening_recordings`; it rejects browser-provided source text.
- The `ielts-listening-audio` bucket is private. Learners receive a 15-minute signed URL only for an active, approved asset they are entitled to access.
- The database claim function and uniqueness key ensure concurrent requests share one generation. Cache hits are logged with zero new estimated credits.
- Regeneration creates a new version and hash. Publishing atomically archives prior active versions, preserving previous rows and files for audit and rollback.
- Multi-speaker recordings use the ElevenLabs Text to Dialogue endpoint and the approved `dialogue` JSON array (`text` and `voice_id` per segment).

## Operational checks

- Keep each approved dialogue request at or below 2,000 characters.
- Monitor `ielts_listening_audio_generation_log` and call `btv_ielts_listening_audio_report()` as an administrator for generation, cache, cost, failure, and storage metrics.
- A missing object is marked invalid rather than served. Generate a new controlled version from the admin workflow.
