(() => {
  'use strict';

  const SUPABASE_URL = 'https://wuvgktmzkzrdvbpqfmek.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_aBmeJWZ0dogy4B3Mjb5JlQ_QyPQ9K2t';

  if (!window.supabase?.createClient) {
    window.btvSupabase = null;
    window.btvSupabaseError = 'The secure account service could not be loaded. Check your connection and restart the app.';
    window.dispatchEvent(new CustomEvent('btv:supabase-error', {
      detail: { message: window.btvSupabaseError }
    }));
    return;
  }

  window.btvSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'btv-auth-session'
      }
    }
  );

  window.dispatchEvent(new CustomEvent('btv:supabase-ready'));
})();
