# Changelog

## Unreleased

- Launch crash fix: do not mount Google useIdTokenAuthRequest when no client IDs are set; wrap GoogleAuthProvider in ErrorBoundary so auth cannot brick cold start.

- Lock-screen harden: opaque lock overlay, ErrorBoundary around the unlocked tree (prevents CryptoProvider remount stuck-on-password after setup), AppState auto-lock only on `background` (not `inactive`) on Android.
- Optional Sign in with Google in Settings (identity only). Stores Google sub/email locally in SecureStore. Does not upload readings, notes, or the master password. Requires EXPO_PUBLIC_GOOGLE_* client IDs and a real APK. App still works signed out.
- OTA (EAS Update) enabled for further updates: `updates.enabled: true` and `checkAutomatically: ON_LOAD`. Same Expo Update URL; `runtimeVersion.policy` remains `appVersion`. Production channel left intact.
- Smoothness follow-up on the existing motion tokens: remaining screens use ScreenEnter / PressScale, list windows stay tight, stack stays a ~200ms fade.
- Log tab moved into History header; widget tap remains quick-log into the form.
- Grok AI insights are parked: Settings toggle and post-log card are hidden. Kill switch `AI_INSIGHTS_AVAILABLE` stays false so no request is sent even if a prior opt-in flag exists. Code and key storage are kept for a later date.
- Log tab (Blood pressure form): optional glucose value and context category sit directly under Heart Rate. Typing a value shows live educational band + Fasting / Before meal / After meal / Bedtime / Random / Other. Saved as a separate encrypted glucose record. Validated before the BP row is written. Leave blank to skip.
- Vercel preview/dev PWA: Expo web export (`expo export -p web` Ã¢â€ â€™ `dist`) plus SPA rewrites so Expo Router paths do not 404. Static client only Ã¢â‚¬â€ no health data leaves the browser.
- Motion pass on the development/preview build: Reanimated enter/press/pulse tokens, OS Reduce Motion respected, shorter fade navigation, LockScreen biometric ring uses PulseScale (paused while authenticating), Dashboard sections use staggered ScreenEnter, tighter list windows + swipe damping, memoized BP chart.
- Glucose module (encrypted, canonical mg/dL). Dedicated tab + Log switcher. Free: 14-day visible history. Pro: 30d/90d/All, backup/PDF inclusion, glucose reminders. CSV import stores all rows on device. Educational range bands only Ã¢â‚¬â€ not diagnostic.
- Free history cap is view-only (14 days for BP and glucose). Logs are never pruned. Subscribing reveals full history from the first log; toggling Pro off hides older rows but does not delete them.
- CSV import (History, Glucose, Settings) stores every valid row for free users. Older-than-14-day rows stay encrypted on device and only appear in lists/export with Pro. Success copy reports how many are visible vs stored. Dashboard recent list, glucose log recents, glucose insights, and Meds vs BP use the same 14-day view window. Pro sees full history from the first log.
- Glucose follow-ups: personal below-target (mg/dL), on-device insight cards, Home Screen widget glucose line (Pro, lock-wipe), optional hide Glucose tab. Chart downsample + frozen inactive tabs.
- Measurement protocol helper on Log (Free): sit, feet flat, rest ~5 min, cuff at heart. Dismiss for the session or Ã¢â‚¬Å“donÃ¢â‚¬â„¢t show againÃ¢â‚¬Â (AsyncStorage preference only). Re-enable in Settings Ã¢â€ â€™ Logging.
- Time-of-day averages on Dashboard (Free, last 14 days, local clock). Pro adds per-bucket counts and the peak window. Fully on-device.
- Meds vs BP: local averages for readings marked taken vs not (need Ã¢â€°Â¥3 in each group). Basic text is Free; two-bar systolic chart is Pro.
- Year-in-review clinician PDF (Pro): monthly averages, category counts, active meds, 30-day appendix. Optional streak/target if provided. Notes omitted. Not a medical device.
- Android Home Screen widget (Pro, opt-in): latest SYS/DIA + category + tap to log. Redacted snapshot (no notes/ids/timestamps). Clears on lock. Needs a dev client or EAS build Ã¢â‚¬â€ not Expo Go.

- Safer legacy medication migration: keep plaintext meds if encrypted persist fails; skip corrupt JSON.
- History undo timeout is stored in a ref so timers clear on unmount without extra renders.
- Local Android development build via `npx expo run:android` (`expo-dev-client`). Expo Go cannot run native AES-256-GCM.
- EAS `development` profile now produces an installable APK. Windows local builds should use a short path (`C:\\bp`) and LongPathsEnabled.

## 1.1.2 — 2026-09-04

- Fix first-unlock hang: keep the app navigator mounted under an opaque lock overlay, wrap the unlocked tree in an ErrorBoundary, and auto-lock only when Android goes to `background` (not `inactive`).
- Optional Sign in with Google in Settings (identity only). Does not replace the master password or upload health data. Needs `EXPO_PUBLIC_GOOGLE_*` client IDs to complete sign-in.
- Enable Expo OTA (EAS Update) for further JS updates: `updates.enabled: true`, `checkAutomatically: ON_LOAD`, production channel. Install this binary once so later patches can ship over the air.
- Support contact email set to stellarmatrixai@gmail.com (privacy policy + store contact).
- Android Play AAB: version 1.1.2, versionCode 6.

## 1.1.1 Ã¢â‚¬â€ 2026-08-15

- CSV import is live on History and Settings (same format as export).
- File picker accepts CSV/JSON on Android instead of only `application/json`.
- Duplicate readings are skipped on import.

## 1.1.0 Ã¢â‚¬â€ 2026-08-14

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

