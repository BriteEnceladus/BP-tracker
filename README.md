# BP Tracker

A secure, standalone blood pressure and heart rate tracking app built with Expo.

## Features

- Strong AES-256-GCM client-side encryption (web)
- Biometric unlock (convenience)
- Charts and history with trend alerts
- Full CRUD: add, edit, delete readings
- Reading detail view
- CSV export
- Dark mode
- PWA + Standalone APK support
- Date/time picker and input validation
- **Puter cloud sync (web)** — sign in under Settings → Cloud Sync to backup/merge readings in your Puter account

## Build Instructions

### Prerequisites
- Node.js 20+
- pnpm
- EAS CLI (`npm install -g eas-cli`)

### Run on your phone (primary)
```bash
cd artifacts/mobile
pnpm install
pnpm run dev:mobile
```
1. Install **Expo Go** on your Android/iPhone  
2. Scan the QR code from the terminal  
3. Use the app on your phone — local storage works offline  

```bash
# Same Wi‑Fi (faster than tunnel)
pnpm run dev

# Browser testing only (secondary)
pnpm run dev:web
```

### Build APK for Android (recommended)
Cloud build — no local Android NDK required. Free Expo account.

```powershell
cd artifacts/mobile
powershell -ExecutionPolicy Bypass -File .\scripts\build-apk.ps1
```

Or step by step:

```powershell
cd artifacts/mobile
npx eas-cli login
npx eas-cli init          # once
npx eas-cli build --platform android --profile preview
```

Download the generated `.apk` → copy to phone → install (allow “unknown apps” if prompted).

Full notes: [`artifacts/mobile/BUILD-APK.md`](artifacts/mobile/BUILD-APK.md)

### iOS App Store
Requires an Apple Developer account. See [`artifacts/mobile/BUILD-IOS.md`](artifacts/mobile/BUILD-IOS.md).

```powershell
cd artifacts/mobile
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --latest
```

### Puter cloud (mobile)
Native Android/iOS use a WebView bridge for Puter sign-in + KV backup.  
**Settings → Optional cloud backup → Connect Puter backup.**

### Production Build with EAS (for App Store / Play Store)
```bash
eas build --platform android --profile production
# or for iOS (requires Apple Developer account)
eas build --platform ios --profile production
```

**Note on Assets:** For production builds and splash screens, add your icon (1024x1024 png) and splash images to `artifacts/mobile/assets/images/`. The app.json references these paths.

## Puter cloud sync (web)

On **web**, open **Settings → Cloud Sync → Sign in with Puter**.

- Readings merge between this device and your Puter account
- Stored in Puter KV (`bp-tracker:readings:v1`) and file `BP-Tracker/readings.json`
- After sign-in, new/edited/deleted readings auto-upload
- Native Android/iOS builds keep local storage only (Puter SDK is browser-based)

Optional simple single-file app (no Expo): `../PulseTrack-puter.html`  
Serve over HTTP, then open in a browser.

## Security
See [SECURITY.md](SECURITY.md) for details.

## License
Personal use / MIT