# Build an Android APK (BP Tracker)

Mobile-first install path: produce a real **`.apk`** you can sideload on your phone.

## Recommended: Expo cloud build (EAS)

Works even if your PC is low on disk space. Free Expo account required.

### 1. Log in (one time)

```powershell
cd "$env:USERPROFILE\OneDrive\Desktop\BP Tracker\BP-tracker-main\artifacts\mobile"
npx eas-cli login
```

Create an account at [expo.dev](https://expo.dev) if needed.

### 2. Link the project (one time)

```powershell
npx eas-cli init
```

Accept defaults if prompted.

### 3. Build the APK

```powershell
npx eas-cli build --platform android --profile preview
```

- Profile **preview** is configured in `eas.json` with `"buildType": "apk"`.
- Build runs in the cloud (~10–20 minutes).
- When finished, open the URL Expo prints, download the **.apk**.

### 4. Install on your phone

1. Copy the APK to the phone (USB, Drive, email, etc.).
2. Open the file on Android.
3. Allow **Install unknown apps** for that file manager if asked.
4. Install → open **BP Tracker**.

---

## Alternative: local build (this PC)

Needs Android SDK, **JDK 17**, NDK, and **~8–12 GB free** disk space.

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

cd "$env:USERPROFILE\OneDrive\Desktop\BP Tracker\BP-tracker-main\artifacts\mobile"
pnpm exec expo prebuild --platform android
cd android
.\gradlew.bat assembleDebug
```

APK output:

```
android\app\build\outputs\apk\debug\app-debug.apk
```

Copy that file to your phone and install.

### Tips if local build fails

| Problem | Fix |
|--------|-----|
| Disk full | Free **8+ GB** on `C:` |
| Java version | Use **JDK 17** (not Java 25 from Android Studio) |
| Gradle “Could not move temporary workspace” | Exclude `C:\Users\<you>\.gradle` from antivirus; retry; avoid building under OneDrive |
| Missing NDK | Install NDK 27.1.12297006 via Android Studio → SDK Manager |

---

## Profiles (`eas.json`)

| Profile | Output | Use |
|---------|--------|-----|
| `preview` | **APK** | Sideload / personal install |
| `production` | AAB | Play Store |
| `development` | Dev client APK | Expo dev builds |

---

## After install

- Readings store **on the phone** (primary).
- Puter cloud backup is optional (browser/PWA); native APK uses on-device storage.
- Not a medical device — personal tracking only.
