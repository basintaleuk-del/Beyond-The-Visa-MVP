# Build and release

## Requirements

- Node.js 22+
- Android Studio with Android SDK 36 and JDK 21
- For iOS: macOS with the current supported Xcode, an Apple Developer account and signing team

## Android test APK

1. Open Android Studio and choose `android/`.
2. Let Gradle install SDK components and finish syncing.
3. Run `npm.cmd run sync` in the project root.
4. Run `android\gradlew.bat assembleDebug`.
5. APK output: `android\app\build\outputs\apk\debug\app-debug.apk`.

## Signed Android App Bundle

1. Create or reuse the permanent Play upload key.
2. Copy `android/keystore.properties.example` to `android/keystore.properties`.
3. Set the real keystore path, passwords and alias. Never commit these files.
4. Run `npm.cmd run android:bundle`.
5. AAB output: `android\app\build\outputs\bundle\release\app-release.aab`.
6. Enrol the app in Play App Signing and securely back up the upload key.

Increase `versionCode` and `versionName` in `android/app/build.gradle` for each store release.

## iOS

1. Copy the full project to a Mac.
2. Run `npm install`, `npm run sync`, then `npx cap open ios`.
3. In Xcode, select the `App` target, your Apple Developer team and bundle ID `org.beyondthevisa.app`.
4. Add Push Notifications and Associated Domains capabilities if those services will be enabled.
5. Test on a physical iPhone and iPad.
6. Use Product > Archive, validate, then distribute through App Store Connect/TestFlight.

## Push notifications

- Android requires `android/app/google-services.json` from Firebase for this exact package ID.
- iOS requires the Push Notifications capability and an APNs key/certificate.
- Run `supabase/mobile_push_subscriptions.sql` before enabling the in-app notification toggle.
