# Changelog

## Unreleased

- Vercel preview/dev PWA: Expo web export (`expo export -p web` → `dist`) plus SPA rewrites so Expo Router paths do not 404. Static client only — no health data leaves the browser.
- Motion pass on the development/preview build: Reanimated enter/press/pulse tokens, OS Reduce Motion respected, shorter fade navigation, lock-screen pulse paused while authenticating, tighter list windows + swipe damping, memoized BP chart.
- Glucose module (encrypted, canonical mg/dL). Dedicated tab + Log switcher. Free: 14-day visible history. Pro: 30d/90d/All, backup/PDF inclusion, glucose reminders. CSV import stores all rows on device. Educational range bands only — not diagnostic.
- Free history cap is view-only (14 days for BP and glucose). Logs are never pruned. Subscribing reveals full history from the first log; toggling Pro off hides older rows but does not delete them.
- CSV import (History, Glucose, Settings) stores every valid row for free users. Older-than-14-day rows stay encrypted on device and only appear in lists/export with Pro. Success copy reports how many are visible vs stored. Dashboard recent list, glucose log recents, glucose insights, and Meds vs BP use the same 14-day view window. Pro sees full history from the first log.
- Glucose follow-ups: personal below-target (mg/dL), on-device insight cards, Home Screen widget glucose line (Pro, lock-wipe), optional hide Glucose tab. Chart downsample + frozen inactive tabs.
- Measurement protocol helper on Log (Free): sit, feet flat, rest ~5 min, cuff at heart. Dismiss for the session or “don’t show again” (AsyncStorage preference only). Re-enable in Settings → Logging.
- Time-of-day averages on Dashboard (Free, last 14 days, local clock). Pro adds per-bucket counts and the peak window. Fully on-device.
- Meds vs BP: local averages for readings marked taken vs not (need ≥3 in each group). Basic text is Free; two-bar systolic chart is Pro.
- Year-in-review clinician PDF (Pro): monthly averages, category counts, active meds, 30-day appendix. Optional streak/target if provided. Notes omitted. Not a medical device.
- Android Home Screen widget (Pro, opt-in): latest SYS/DIA + category + tap to log. Redacted snapshot (no notes/ids/timestamps). Clears on lock. Needs a dev client or EAS build — not Expo Go.

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
