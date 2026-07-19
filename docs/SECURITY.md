# Mobile security decisions

- Cleartext HTTP is disabled on Android.
- Android OS backups are disabled to reduce accidental session/data extraction.
- Service-role, Gemini and payment secrets must stay in Supabase Edge Functions.
- OAuth returns through an app-specific scheme and Supabase performs the PKCE session exchange.
- Push tokens are user-owned under RLS.
- Upload signing material is excluded from Git.
- Native WebView debugging is disabled in production configuration.
- External URLs should be restricted to trusted HTTPS destinations.
- Patient-identifiable information must not be entered into Zibur.

Before release, run dependency auditing, Supabase RLS tests, provider redirect tests and mobile penetration testing appropriate to the sensitivity of stored documents.
