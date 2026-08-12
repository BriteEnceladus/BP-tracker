# Changelog

All notable changes to BP Tracker are documented here.

## [1.3.0] — 2026-08-12

### Added
- **Puter cloud backup on native mobile** (Android/iOS) via WebView bridge
- Settings: connect / upload / pull-merge / disconnect Puter on device
- iOS App Store production EAS profile and `BUILD-IOS.md`
- Git versioning docs (`VERSIONING.md`) and release tags

### Changed
- App version **1.3.0** (Android versionCode 4)
- Mobile-first Settings copy (phone storage first, cloud optional)
- Cleaner `package.json` for reliable EAS installs

### Fixed
- EAS build lockfile mismatch (`expo` version drift)
- EAS projectId wiped by `app.config.js` extra merge
- History screen crash (`Swipeable` import on web)

## [1.2.0] — 2026-08-11

### Added
- First successful EAS Android **APK** (preview profile)
- Puter cloud sync on **web**
- Export CSV improvements on web

## [1.0.0] — earlier

### Added
- Core BP + heart rate logging
- Local encryption gate, charts, history
- Expo mobile app scaffold
