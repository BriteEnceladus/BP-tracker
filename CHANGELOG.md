# Changelog

## Unreleased

- Optional Sign in with Google in Settings (feature/google-sign-in). Stores Google sub/email locally in SecureStore. Does not upload readings, notes, or the master password. Requires EXPO_PUBLIC_GOOGLE_* client IDs and a real APK. App still works signed out.
- OTA (EAS Update) is off for the Play launch binary: `updates.enabled: false` and `checkAutomatically: NEVER`. Update URL is kept. Preview workflow no longer publishes on push to main. Turn back on after launch by flipping the flag.
