# Beyond The Visa mobile

Production Capacitor wrapper around the existing Beyond The Visa application.
The web product remains the source of truth in `web/`; it has not been rebuilt or replaced.

## Quick start

```powershell
npm.cmd install
npm.cmd run sync
npx.cmd cap open android
```

On macOS, use `npx cap open ios` for Xcode.

## Project layout

- `web/` preserved website and content
- `src/` native-only bridge and responsive mobile layer
- `www/` generated mobile web bundle; do not edit directly
- `android/` Android Studio project
- `ios/` Xcode project
- `supabase/` optional mobile database migrations
- `docs/` release, security and QA instructions

Run `npm.cmd run sync` after changing `web/` or `src/`.
