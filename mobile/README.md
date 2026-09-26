# Velantin Live mobile

This directory is a real Expo/React Native app and is separate from the responsive Next.js web client.

## Local development

```bash
npm install
npx expo prebuild
npx expo run:android
# iOS requires macOS + Xcode:
npx expo run:ios
```

The app currently demonstrates the native integration shell: secure session-token storage with `expo-secure-store`, `velantin://invite?ref=...` referral deep links, Sinhala/Tamil/English UI labels, push permission/token registration, camera and microphone permission controls, low-data mode state, and background audio/remote-notification configuration.

## Firebase and push setup

Do **not** invent or commit these files:

- Android: place the Firebase console download at `android/app/google-services.json` after running prebuild.
- iOS: place the Firebase console download at `ios/GoogleService-Info.plist` after running prebuild.
- Configure Android notification credentials and an APNs key/team/bundle identifier in the chosen EAS or native signing workflow.

The web API still owns Firebase Auth verification and Firestore/payment authorization. The mobile client must send the short-lived/session token in an `Authorization: Bearer` header to the same API origin; tokens are kept in platform secure storage, not AsyncStorage or source code.

## Live video integration

The web backend exposes the authenticated Agora token endpoint at `/api/agora/token`. A production mobile live-room screen should use the returned token with the native Agora SDK, apply the low-data profile before joining, and enforce server-side room gating exactly as the web client does. Agora App ID/certificate and Firebase Admin values belong in deployment secrets only.

## Native build limitation

Android debug builds can be produced on a Linux host once Android SDK/Gradle dependencies are installed. A signed iOS archive/IPA requires macOS/Xcode and Apple signing credentials; this repository does not pretend to produce one in Linux.
