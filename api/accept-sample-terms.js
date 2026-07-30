const { createHash } = require('node:crypto');

const env = name => process.env[name] || '';
const reply = (res, status, body) => res.status(status)
  .setHeader('cache-control', 'private, no-store')
  .setHeader('content-type', 'application/json; charset=utf-8')
  .send(JSON.stringify(body));

const TERMS_VERSION = '2026-07-24-sample-mocks-v1';
const TERMS_TEXT = 'Original unofficial sample questions; not official exam questions; not clinically reviewed; educational guidance only; never replaces official materials, professional training, local policy or clinical judgement.';

async function authenticatedUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const base = env('SUPABASE_URL');
  const key = env('SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_ANON_KEY');
  if (!token || !base || !key) return null;
  const response = await fetch(`${base}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` }
  });
  return response.ok ? response.json() : null;
}

module.exports = async function acceptSampleTerms(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { success: false, error: 'Method not allowed.' });
  try {
    const user = await authenticatedUser(req);
    if (!user?.id) return reply(res, 401, { success: false, error: 'Please sign in to continue.' });

    const base = env('SUPABASE_URL');
    const serviceKey = env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
    if (!base || !serviceKey) return reply(res, 503, { success: false, error: 'Secure acknowledgement service is unavailable.' });

    const record = {
      user_id: user.id,
      terms_version: TERMS_VERSION,
      terms_text_hash: createHash('md5').update(TERMS_TEXT).digest('hex'),
      accepted_at: new Date().toISOString()
    };
    const response = await fetch(`${base}/rest/v1/btv_exam_sample_acceptances?on_conflict=user_id,terms_version`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'content-type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(record)
    });
    if (!response.ok) throw new Error((await response.text()).slice(0, 400) || 'Acknowledgement could not be recorded.');
    return reply(res, 200, { success: true, terms_version: TERMS_VERSION });
  } catch (error) {
    console.error('Sample terms acknowledgement failed', error);
    return reply(res, 500, { success: false, error: 'Your acknowledgement could not be recorded. No coins were deducted.' });
  }
};
