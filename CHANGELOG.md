# Changelog

## Unreleased

- Password setup on downloaded APKs: install react-native-quick-crypto over a stub global.crypto (getRandomValues-only). Setup no longer fails with an Expo Go message on a real Play/EAS binary. Expo Go still cannot encrypt; the error now says to open the BP Tracker icon instead.
- Launch crash fix: do not mount Google useIdTokenAuthRequest when no client IDs are set; wrap GoogleAuthProvider in ErrorBoundary so auth cannot brick cold start.
- Lock-screen harden: opaque lock overlay, ErrorBoundary around the unlocked tree (prevents CryptoProvider remount stuck-on-password after setup), AppState auto-lock only on `background` (not `inactive`) on Android.
- Optional Sign in with Google in Settings (identity only). Stores Google sub/email locally in SecureStore. Does not upload readings, notes, or the master password. Requires EXPO_PUBLIC_GOOGLE_* client IDs and a real APK. App still works signed out.
- OTA (EAS Update) enabled for further updates: `updates.enabled: true` and `checkAutomatically: ON_LOAD`. Same Expo Update URL; `runtimeVersion.policy` remains `appVersion`. Production channel left intact.

## 1.1.2 — 2026-09-04

- Fix first-unlock hang: keep the app navigator mounted under an opaque lock overlay, wrap the unlocked tree in an ErrorBoundary, and auto-lock only when Android goes to `background` (not `inactive`).
- Optional Sign in with Google in Settings (identity only). Does not replace the master password or upload health data. Needs `EXPO_PUBLIC_GOOGLE_*` client IDs to complete sign-in.
- Enable Expo OTA (EAS Update) for further JS updates: `updates.enabled: true`, `checkAutomatically: ON_LOAD`, production channel. Install this binary once so later patches can ship over the air.
- Support contact email set to stellarmatrixai@gmail.com (privacy policy + store contact).
- Android Play AAB: version 1.1.2, versionCode 6.

## 1.1.1 — 2026-08-15

- CSV import is live on History and Settings (same format as export).
- File picker accepts CSV/JSON on Android instead of only `application/json`.
- Duplicate readings are skipped on import.

## 1.1.0 — 2026-08-14

- Merge the polish design system into `main` (color-coded readings, medications, legal docs).
- Optional Grok AI insights after logging a reading. Off by default. Uses your xAI key and an anonymized numbers-only payload.
- Encrypted backup and restore with replace confirmation.
- PDF clinician report plus existing plaintext CSV export.
- Local measurement and medication reminders.
- Shared category colors on Dashboard, Log, History, and reading detail.
- Faster History list rendering and stronger empty / onboarding copy.
- More unit tests for category logic, anonymized AI payload, and backup encryption.

## 1.0.0

- Initial encrypted BP + medications tracker with AES-256-GCM, biometric convenience unlock, and CSV export.
