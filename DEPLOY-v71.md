# Beyond The Visa v71 deployment

## Completed
- Restored missing site and admin controllers.
- Zibur calls the secure `zibur-gemini` Supabase Edge Function; the browser never receives the Google key.
- General Zibur and IELTS use a local knowledge/rubric fallback when the Edge Function is unavailable.
- IELTS Writing feedback is labelled as a formative estimate, not an official score.
- Academic Task 1 now covers tables, trends, processes, maps and proportion charts; Task 2 retains multiple essay styles.
- CBT target remains 1,000. NCLEX draft target is 2,000. Generated items stay hidden until qualified clinical review.
- Community cards now explain each future feature.
- Books is a standalone admin area with upload/publish and published-book listing.
- New supplied v71 image is used on the login experience.

## Required secure deployment step
1. In Supabase Edge Functions, deploy `supabase/functions/zibur-gemini/index.ts` with function name `zibur-gemini`.
2. In Edge Function Secrets, set `GEMINI_API_KEY` to the Google AI Studio key.
3. Optional: set `GEMINI_MODEL=gemini-2.5-flash`.
4. Keep JWT verification enabled. Do not place the Google key in website files.

## Clinical content governance
The additional NCLEX records are inactive drafts. A qualified NCLEX/clinical reviewer must check wording, answer, rationale, blueprint allocation and current guidance before each record is activated. The app and admin counts distinguish total records from published records.

## Verification completed
- JavaScript syntax check: passed.
- Capacitor web build and Android/iOS sync: passed.
- Android debug APK build: passed with Android Studio Java 21.
- Browser automation was unavailable due a local Windows ACL sandbox failure; complete the signed-in smoke test below after upload.

## Five-minute smoke test after upload
1. Create account, sign out, sign in with email and Google.
2. Open Zibur, ask a question online, then test once with network disabled.
3. Open IELTS Writing, submit a response, confirm AI or local formative feedback appears.
4. Open Community and confirm descriptive cards and Notify me.
5. Admin: open Books, confirm uploaded rows, upload a test PDF, then open learner Library.
6. Admin: confirm CBT target 1,000 and NCLEX target 2,000; do not publish unreviewed drafts.