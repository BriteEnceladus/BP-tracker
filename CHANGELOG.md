# Changelog

## Unreleased

- 1.1.5: User-facing display name is now Quenly (dev/internal name was BP Tracker). Version 1.1.5 / android.versionCode 10.
- 1.1.4 Play password setup: no longer depends on QuickCrypto native loading. Falls back to JS AES-256-GCM via `@noble/ciphers` + PBKDF2 (100k) via `@noble/hashes` when the native module is absent (same EncryptedData shape). Optional follow-up: QuickCrypto 1.x + nitro — not upgraded in this pass.
- 1.1.3 Play hotfix: install QuickCrypto in `index.ts` before Expo Router boots so password setup works on a store APK. Rebuild the production AAB — 1.1.1 cannot receive this over OTA (OTA was off in that binary).


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
