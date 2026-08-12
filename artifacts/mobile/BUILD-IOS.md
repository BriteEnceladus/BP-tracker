# Submit BP Tracker to the iOS App Store

## Requirements

1. **Apple Developer Program** membership ($99/year)  
   https://developer.apple.com/programs/
2. Logged into Expo: `npx eas-cli login`
3. Mac not required for cloud builds (EAS builds iOS in the cloud)

## One-time Apple / EAS setup

```powershell
cd artifacts/mobile

# Log in to Expo (if needed)
npx eas-cli login

# Register iOS credentials (EAS can manage certs for you)
npx eas-cli credentials
# Choose iOS → production → let EAS create/manage certificates & provisioning
```

Or on first production build, EAS prompts to set up credentials interactively.

### App Store Connect

1. Go to https://appstoreconnect.apple.com  
2. **My Apps → + → New App**  
3. Bundle ID: `com.briteenceladus.bptracker`  
4. Note your **Apple ID** email, **Team ID**, and later **App Store Connect App ID** (numeric)

Optional: fill `eas.json` → `submit.production.ios`:

```json
"ios": {
  "appleId": "you@email.com",
  "ascAppId": "1234567890",
  "appleTeamId": "AB12CD34EF"
}
```

## Build for App Store

```powershell
cd artifacts/mobile
npx eas-cli build --platform ios --profile production
```

- Produces an **.ipa** suitable for App Store Connect  
- Takes ~15–30 minutes on EAS  

### TestFlight / internal iOS (not App Store)

```powershell
npx eas-cli build --platform ios --profile preview
```

Install via QR / Expo dashboard on a registered device (ad hoc / internal distribution).

## Submit to App Store

After the production build finishes:

```powershell
npx eas-cli submit --platform ios --profile production --latest
```

Or upload manually from the Expo build page → **Submit to App Store**.

Then in App Store Connect:

1. Complete listing (screenshots, description, privacy policy URL)  
2. Age rating, export compliance (encryption: standard / exempt)  
3. Submit for review  

## Privacy & health notes

- BP Tracker is **not** a medical device — state that in the description  
- Include a privacy policy URL (required for App Store)  
- Data: on-device + optional Puter cloud under the user’s Puter account  

## Versioning

| Field | File | Notes |
|-------|------|--------|
| `version` | `app.json` → `expo.version` | User-facing e.g. `1.3.0` |
| `buildNumber` | `app.json` → `ios.buildNumber` | Auto-increments if `autoIncrement: true` on production |

## Cloud on iOS

Native iOS uses the **Puter WebView bridge** (`PuterHost`).  
Settings → **Optional cloud backup** → **Connect Puter backup** opens Puter sign-in on-device.

## Rebuild Android APK after cloud changes

```powershell
npx eas-cli build --platform android --profile preview
```
