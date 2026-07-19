# Mobile implementation changelog

## 1.0.0

- Preserved the existing v69 Beyond The Visa HTML, CSS, JavaScript, Supabase integration, learning content and Zibur flows.
- Added Capacitor 8 with package ID `org.beyondthevisa.app` and generated Android and iOS projects.
- Added native safe-area, phone and tablet styling without changing the website source-of-truth architecture.
- Added native Google OAuth browser return handling through `org.beyondthevisa.app://auth/callback`.
- Added camera/profile-photo capture, native share sheet, dialogs, toast, haptics, keyboard handling, status bar, splash screen and Android back handling.
- Added opt-in push registration and an RLS-protected Supabase device-token migration.
- Added offline/network status and pull-to-refresh behavior.
- Generated Android adaptive/round/legacy icons, notification icon and light/dark splash assets from the supplied logo.
- Generated the iOS app icon and light/dark splash assets.
- Disabled Android cleartext traffic and app backups; added HTTPS/custom-scheme deep links.
- Added conditional upload-keystore release signing, R8 minification and resource shrinking.
- Added iOS camera/photo permission copy, OAuth URL scheme and remote-notification background mode.

## Deliberate compatibility decisions

- The current source contains Google sign-in only. The native OAuth bridge is provider-ready, but Apple and Facebook buttons were not fabricated because they are not present in the supplied web build and require provider credentials and store configuration.
- Biometric login is not enabled with an unreviewed third-party dependency. Supabase sessions remain stored by the official Capacitor/WebView security model; biometric protection can be added after selecting and security-reviewing a native biometric plugin.
- Study content remains backend-driven wherever the current web application already uses Supabase, so content changes do not require a store release.
