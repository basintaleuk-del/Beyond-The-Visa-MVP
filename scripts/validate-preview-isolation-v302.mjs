import { createHash } from 'node:crypto';

if (process.env.VERCEL_ENV !== 'preview') {
  console.log('Preview isolation guard skipped outside Vercel Preview.');
  process.exit(0);
}

const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'PAYSTACK_SECRET_KEY',
  'APP_URL',
  'BTV_PRODUCTION_SERVICE_ROLE_SHA256',
  'BTV_PRODUCTION_PAYSTACK_SECRET_SHA256'
];
const missing = required.filter((name) => !String(process.env[name] || '').trim());
if (missing.length) throw new Error(`Preview isolation is incomplete; missing: ${missing.join(', ')}`);

const productionRef = String(process.env.BTV_PRODUCTION_SUPABASE_PROJECT_REF || 'wuvgktmzkzrdvbpqfmek').trim();
const supabaseUrl = new URL(process.env.SUPABASE_URL);
const previewRef = supabaseUrl.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)?.[1] || '';
if (!previewRef) throw new Error('SUPABASE_URL is not a recognised Supabase project URL.');
if (previewRef === productionRef) throw new Error('Preview Supabase project matches production.');

const appUrl = new URL(process.env.APP_URL);
const productionHosts = new Set(['beyondthevisa.org', 'www.beyondthevisa.org', 'beyondthevisa.uk', 'www.beyondthevisa.uk']);
if (productionHosts.has(appUrl.hostname)) throw new Error('Preview APP_URL points at an owned production hostname.');

if (!String(process.env.PAYSTACK_SECRET_KEY).startsWith('sk_test_')) {
  throw new Error('Preview Paystack configuration is not test mode.');
}

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');
if (sha256(process.env.SUPABASE_SERVICE_ROLE_KEY) === process.env.BTV_PRODUCTION_SERVICE_ROLE_SHA256.trim().toLowerCase()) {
  throw new Error('Preview service-role credential matches production.');
}
if (sha256(process.env.PAYSTACK_SECRET_KEY) === process.env.BTV_PRODUCTION_PAYSTACK_SECRET_SHA256.trim().toLowerCase()) {
  throw new Error('Preview Paystack credential matches production.');
}

console.log('Preview isolation guard passed without exposing credential values.');
