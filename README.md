# BP Tracker

A secure, standalone blood pressure and heart rate tracking app built with Expo.

## Features

- Strong AES-256-GCM client-side encryption (web)
- Biometric unlock (convenience)
- Rule-based smart suggestions based on readings and medications
- Medication tracking
- Charts and history
- CSV export/import
- Dark mode
- PWA + Standalone APK support

## Build Instructions

### Prerequisites
- Node.js 20+
- pnpm
- EAS CLI (`npm install -g eas-cli`)

### Run locally
```bash
git clone https://github.com/BriteEnceladus/BP-tracker.git
cd BP-tracker/Health-Monitor-Hub
pnpm install
pnpm --filter @workspace/mobile run dev
```

### Build APK for Android
```bash
cd artifacts/mobile
eas build --platform android --profile preview
```

Download the generated `.apk` and install on your Android device.

## Security
See [SECURITY.md](SECURITY.md) for details.

## License
Personal use / MIT