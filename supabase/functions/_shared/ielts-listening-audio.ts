import { createClient } from 'npm:@supabase/supabase-js@2';

export const BUCKET = 'ielts-listening-audio';
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
export const normaliseScript = (value: string) => value.replace(/\r\n?/g, '\n').trim().replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n');
export const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};
export const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
  .map(byte => byte.toString(16).padStart(2, '0')).join('');

export function clients(request: Request) {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!url || !anonKey || !serviceKey || !authorization) throw Object.assign(new Error('Authentication is required.'), { code: 'UNAUTHENTICATED', status: 401 });
  return {
    userDb: createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } }),
    adminDb: createClient(url, serviceKey, { auth: { persistSession: false } }),
  };
}

export async function userFromRequest(request: Request) {
  const { userDb, adminDb } = clients(request);
  const { data, error } = await userDb.auth.getUser();
  if (error || !data.user) throw Object.assign(new Error('Authentication is required.'), { code: 'UNAUTHENTICATED', status: 401 });
  const { data: profile, error: profileError } = await adminDb.from('profiles').select('role,account_type').eq('id', data.user.id).single();
  if (profileError || !profile) throw Object.assign(new Error('Account profile is unavailable.'), { code: 'PROFILE_UNAVAILABLE', status: 403 });
  return { user: data.user, profile, userDb, adminDb };
}

export function errorResponse(error: unknown) {
  const item = error as { message?: string; code?: string; status?: number };
  return reply({ success: false, code: item.code || 'REQUEST_FAILED', error: item.message || 'Request failed.' }, item.status || 400);
}

export async function storageObjectExists(adminDb: ReturnType<typeof createClient>, path: string) {
  const slash = path.lastIndexOf('/');
  const directory = slash === -1 ? '' : path.slice(0, slash);
  const file = slash === -1 ? path : path.slice(slash + 1);
  const { data, error } = await adminDb.storage.from(BUCKET).list(directory, { search: file });
  if (error) return false;
  return Boolean(data?.some(item => item.name === file));
}
