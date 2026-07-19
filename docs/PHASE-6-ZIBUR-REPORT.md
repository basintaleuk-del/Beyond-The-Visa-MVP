# Phase 6 — Zibur

Completed locally on 17 July 2026.

- Standardised the full-page, floating and IELTS Zibur experiences on the secure `zibur-gemini` Edge Function.
- Retained the existing Gemini API secret and model configuration while presenting the assistant only as Zibur.
- Added authenticated, privacy-preserving request governance: SHA-256 question hashes, no raw-question logging, twelve requests per user per minute, outcome and latency records.
- Added explicit clinical, regulatory, exam and IELTS safety boundaries.
- Standardised the on-device fallback so Zibur remains useful when the provider is unavailable.
- Kept all five bottom-navigation items unchanged.
- Added automated governance, identity, safety and fallback tests.

Deployment dependency: migration `202607170009` must be applied before deploying the updated `zibur-gemini` function.

