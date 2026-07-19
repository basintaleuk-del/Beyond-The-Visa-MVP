# Supabase mobile setup

## Authentication redirects

In Supabase Dashboard > Authentication > URL Configuration, add:

- `org.beyondthevisa.app://auth/callback`
- `https://beyondthevisa.org/`

Keep the production site URL as `https://beyondthevisa.org`.

## Google provider

- Keep Google enabled in Supabase.
- Add an Android OAuth client for package `org.beyondthevisa.app` and its debug/release SHA-1 fingerprints.
- Add an iOS OAuth client for bundle ID `org.beyondthevisa.app`.
- Do not place Google client secrets in the app.

## Apple and Facebook

The supplied v69 UI exposes Google only. To activate Apple or Facebook later:

1. Enable the provider in Supabase Authentication.
2. Configure the provider callback URL shown by Supabase.
3. Add the relevant Apple/Facebook app identifiers and store declarations.
4. Add the button to the authentication UI and call the existing native `beginOAuth` provider bridge.

## Keys and Edge Functions

- The Supabase anon/publishable key may be present in the client; Row Level Security is the security boundary.
- Never bundle the service-role key, Gemini key, Paystack secret, APNs key or Firebase service credentials.
- Keep Zibur/Gemini, payments and privileged operations in Supabase Edge Functions.
- Verify RLS on every content, profile, progress, booking, payment and push-subscription table.
