# Changelog

## Unreleased

- Measurement protocol helper on Log (Free): sit, feet flat, rest ~5 min, cuff at heart. Dismiss for the session or “don’t show again” (AsyncStorage preference only). Re-enable in Settings → Logging.
- Time-of-day averages on Dashboard (Free, last 30 days, local clock). Pro adds per-bucket counts and the peak window. Fully on-device.
- Meds vs BP: local averages for readings marked taken vs not (need ≥3 in each group). Basic text is Free; two-bar systolic chart is Pro.
- Year-in-review clinician PDF (Pro): monthly averages, category counts, active meds, 30-day appendix. Optional streak/target if provided. Notes omitted. Not a medical device.

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
