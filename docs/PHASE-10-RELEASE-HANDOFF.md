# Phase 10 — Release handoff

## Build status

- Production web bundle: passed
- TypeScript: passed
- Automated tests: 27 passed
- Release audit: 0 failures, 0 warnings
- Capacitor Android sync: passed
- Android debug APK: built
- Android release AAB: built, intentionally unsigned
- iOS Capacitor project: synced and ready to open in Xcode on macOS

## Deliverables

- `deliverables/Beyond-The-Visa-Android-Test-Phase10.apk`
  - SHA-256: `13A595857DFD139BA3683542733FBDBBEC4640799E86BCDCB4F7AAF7D3B40798`
- `deliverables/Beyond-The-Visa-Android-Release-Phase10-UNSIGNED.aab`
  - SHA-256: `B8FE8ECFD1CC082975F6FCD3BCEB329FF951461276A46530E864370FA7408CD3`

The AAB must be signed with the organisation's private Play upload key. Do not share the key or commit `keystore.properties`.

## Supabase deployment order

1. Back up the database and verify recovery access.
2. Apply checked-in migrations in filename order, including Phase 5 through Phase 8.
3. Deploy the checked-in Edge Functions.
4. Configure production secrets only in Supabase; never place Gemini, Paystack or service-role secrets in web or mobile code.
5. Verify RLS, storage policies and admin permissions with separate free, Premium and admin accounts.
6. Run the payment webhook and Premium restoration tests before accepting live payments.

## Android release

1. Create or recover the permanent Play upload keystore.
2. Create local `android/keystore.properties` using `android/keystore.properties.example` as the pattern.
3. Run `npm run verify`.
4. Run `npm run android:bundle` with Android Studio's bundled JDK selected.
5. Upload the signed AAB to Google Play internal testing first.
6. Complete Data Safety, content rating, privacy-policy and account-deletion declarations.
7. Promote only after `docs/MOBILE-QA-CHECKLIST.md` passes on physical devices.

## iOS release

1. Transfer the repository to macOS with current Xcode.
2. Run `npm ci`, `npm run sync`, then `npx cap open ios`.
3. Select the organisation team and configure the bundle identifier `org.beyondthevisa.app`.
4. Configure Sign in with Apple, associated domains, push entitlements and privacy usage descriptions.
5. Archive in Xcode and upload to TestFlight.
6. Complete App Privacy and account-deletion declarations and pass physical-device QA before App Store review.

## Known external gates

Store signing credentials, Apple certificates, live Paystack settlement, OAuth production consent and physical-device testing require owner/store access and cannot be completed safely from source code alone.
