(() => {
  const SUPABASE_URL = 'https://wuvgktmzkzrdvbpqfmek.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_aBmeJWZ0dogy4B3Mjb5JlQ_QyPQ9K2t';

  if (!window.supabase?.createClient) {
    throw new Error('Supabase library failed to load.');
  }

  window.btvSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
})();
