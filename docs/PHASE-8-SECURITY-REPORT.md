# Phase 8 — Security and infrastructure report

- Added constrained Supabase Storage buckets and user-folder ownership policies.
- Added admin-only publication policies for learning media, books and IELTS audio.
- Added privacy-safe authenticated client-event monitoring without raw form or question storage.
- Added CSP, referrer and permissions controls to the application shell.
- Preserved strict Capacitor transport settings: no cleartext, mixed content or production WebView debugging.
- Added backup, secret rotation, restore-drill and incident-response procedures.

The current CSP permits inline scripts/styles as a temporary compatibility allowance for the legacy single-document application. Removing that allowance requires extracting the remaining inline code and should be treated as a future hardening milestone.
