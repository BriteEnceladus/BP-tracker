# BP Tracker

A secure, standalone blood pressure and heart rate tracking app built with Expo.

## Features

- Strong AES-256-GCM client-side encryption (per-reading, web + native)
- Biometric unlock (convenience only — not a root of trust)
- Color-coded readings, charts, and history with trend alerts
- Optional Grok insights after a log (opt-in, anonymized payload, your xAI key)
- Encrypted backup / restore and plaintext CSV / PDF export
- Local measurement and medication reminders
- Full CRUD: add, edit, delete readings and medications
- Dark mode, PWA + Standalone APK support

## Build Instructions

Native AES-256-GCM (`react-native-quick-crypto`) does **not** work in Expo Go. Use a development build.

### Prerequisites
- Node.js 20+
- pnpm
- JDK 17
- Android Studio / Android SDK (for a local Android build)
- EAS CLI (`npm install -g eas-cli`) — only for cloud builds

### Development build (Android)

This compiles a custom native app with crypto linked, installs it, and starts Metro.

```powershell
cd artifacts/mobile
pnpm install
npx expo run:android
```

Physical device (USB debugging on):

```powershell
npx expo run:android --device
```

After the native app is installed, later JS-only work is just:

```powershell
npx expo start --dev-client
```

Rebuild native code after adding a native library, changing `app.json`, or upgrading the Expo SDK:

```powershell
npx expo prebuild --platform android --clean
npx expo run:android
```

Helper scripts:

```powershell
# Checks JDK + Android SDK, then runs expo run:android
.\scripts\Run-Android-Dev.ps1

# Optional: install command-line Android SDK packages (no Android Studio UI)
.\scripts\Setup-Android-Sdk.ps1
```

**Windows notes**

- Do not build from a OneDrive folder. Copy the project to a short path such as `C:\bp` first (`node_modules` + CMake codegen exceed the 260-character path limit).
- Enable long paths (Administrator PowerShell), then reboot:

```powershell
Set-ItemProperty -Path HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem -Name LongPathsEnabled -Value 1
```

- Plug in a phone with USB debugging, or enable the Android Emulator hypervisor driver (AEHD). This machine has no hypervisor, so the emulator will not boot.
- For installable APKs on Windows, use **EAS cloud** (`eas build --platform android --profile preview`). Do not use `eas build --local`.
- Cloud development-client APK (no local NDK): `eas build --platform android --profile development`

### Run Metro only (web / already-installed client)
```powershell
cd artifacts/mobile
pnpm install
pnpm dev
```

### Build APK for Android (Preview)

Cloud EAS only (Windows: do not pass `--local`):

```powershell
cd artifacts/mobile
pnpm install
eas build --platform android --profile preview
```

Cloud development-client APK (no local Android SDK):

```bash
cd artifacts/mobile
eas build --platform android --profile development
```

Download the generated `.apk` and install on your Android device.

### Production Build with EAS (for App Store / Play Store)
```bash
eas build --platform android --profile production
# or for iOS (requires Apple Developer account)
eas build --platform ios --profile production
```

**Note on Assets:** For production builds and splash screens, add your icon (1024x1024 png) and splash images to `artifacts/mobile/assets/images/`. The app.json references these paths.

## Security
See [SECURITY.md](SECURITY.md) for details.

## License
Personal use / MIT
