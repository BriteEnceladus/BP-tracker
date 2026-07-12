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

**Note on Assets:** For production builds and splash screens, add your icon (1024x1024 png) and splash images to `artifacts/mobile/assets/images/`. The app.json references these paths.

## Security
See [SECURITY.md](SECURITY.md) for details.

## License
Personal use / MIT