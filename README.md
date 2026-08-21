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
- Optional Android Home Screen widget (Pro): latest SYS/DIA + tap to log. Requires a native build.

## Build Instructions

### Prerequisites
- Node.js 20+
- pnpm
- EAS CLI (`npm install -g eas-cli`)

### Run locally
```bash
git clone https://github.com/BriteEnceladus/BP-tracker.git
cd BP-tracker
pnpm install
pnpm --filter @workspace/mobile run dev
```

### Build APK for Android (Preview)
```bash
cd artifacts/mobile
eas build --platform android --profile preview
```

Download the generated `.apk` and install on your Android device.

### Production Build with EAS (for App Store / Play Store)
```bash
eas build --platform android --profile production
# or for iOS (requires Apple Developer account)
eas build --platform ios --profile production
```

### Home Screen widget (Android)

The widget is **not available in Expo Go**. Native AES-256-GCM and `react-native-android-widget` both need a development client or EAS APK:

```bash
cd artifacts/mobile
pnpm install
npx expo prebuild --platform android
npx expo run:android
```

Or `eas build --platform android --profile preview`. Then Settings → Home Screen (Pro) → Show latest reading on widget. Tap the widget to open Log (`bptracker://log`). Numbers clear when the app locks. Notes never leave the vault.

**Note on Assets:** For production builds and splash screens, add your icon (1024x1024 png) and splash images to `artifacts/mobile/assets/images/`. The app.json references these paths.

## Security
See [SECURITY.md](SECURITY.md) for details.

## License
Personal use / MIT
