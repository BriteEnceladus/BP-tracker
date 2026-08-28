# BP Tracker

A secure, standalone blood pressure and heart rate tracking app built with Expo.

## Features

- Strong AES-256-GCM client-side encryption (per-reading, web + native)
- Biometric unlock (convenience only — not a root of trust)
- Color-coded readings, charts, and history with trend alerts
- Grok insights code is in the repo but hidden/disabled for now (`AI_INSIGHTS_AVAILABLE = false`)
- Encrypted backup / restore and plaintext CSV / PDF export
- Local measurement and medication reminders
- Full CRUD: add, edit, delete readings and medications
- Dark mode, PWA + Standalone APK support
- Optional Android Home Screen widget (Pro): latest SYS/DIA + tap to log. Requires a native build.

## Build Instructions

### Prerequisites
- Node.js 20+
