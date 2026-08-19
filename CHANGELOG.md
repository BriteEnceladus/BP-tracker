# Changelog

## Unreleased — Premium gates (UI mock)

- Freemium matrix locked: free = last 30 days history + basic tracking; Pro = full history, AI insights, import, encrypted backup/restore, PDF report, reminders.
- `PremiumContext` + mock toggle in Settings (dev only). Real subscription IAP to follow.
- Soft locks on History ranges (90d / All), CSV import, AI insights, reminders, backup, restore, and PDF.

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
