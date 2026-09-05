# Changelog

## Unreleased

- Password setup on downloaded APKs: install react-native-quick-crypto over a stub global.crypto (getRandomValues-only). Setup no longer fails with an Expo Go message on a real Play/EAS binary. Expo Go still cannot encrypt; the error now says to open the BP Tracker icon instead.
- Launch crash fix: do not mount Google useIdTokenAuthRequest when no client IDs are set; wrap GoogleAuthProvider in ErrorBoundary so auth cannot brick cold start.
- Lock-screen harden: opaque lock overlay, ErrorBoundary around the unlocked tree (prevents CryptoProvider remount stuck-on-password after setup), AppState auto-lock only on `background` (not `inactive`) on Android.
