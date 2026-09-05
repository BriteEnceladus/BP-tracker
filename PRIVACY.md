# Privacy Policy — Quenly

**Last updated:** August 14, 2026  
**App:** Quenly (com.briteenceladus.bptracker)  
**Developer:** BriteEnceladus

## Summary

Quenly is a **fully offline, privacy-first** personal health tracking app.  
**We collect no data.** Everything stays on your device. There is no account, no server, and no analytics.

---

## 1. What data the app stores

The app stores the following **only on your device**:

- Blood pressure and heart rate readings (systolic, diastolic, pulse, timestamp, optional notes)
- Medication list you enter (name, dosage, frequency, status)
- App settings (auto-lock timeout, reminder preference, biometric enrollment flag)
- Encryption material needed to protect the above (salt + password verifier)

This data is encrypted on-device using AES-256-GCM before it is written to storage.

## 2. What we do **not** collect

- No name, email, phone number, or account
- No device identifiers sent anywhere
- No location data used or transmitted
- No analytics, crash reporting, or advertising SDKs
- No health data is uploaded to us. There is no Quenly account or analytics backend.
- No third-party trackers or advertising SDKs.

**Optional Grok insights (off by default):** if you explicitly opt in and paste your own xAI API key, the app can send a *minimal anonymized summary* (latest systolic/diastolic/pulse, category, 7-day averages, 14-day category counts, and a coarse trend). Notes, exact timestamps, names, and identifiers are not included. That request goes from your device to `api.x.ai` using your key. Turn the feature off and remove the key at any time.

## 3. Encryption & security

- Master password is never stored.
- Readings and medications are encrypted with a key derived from your password (PBKDF2, 100,000 iterations → AES-256-GCM).
- The encryption key exists only in memory while the app is unlocked.
- Biometric unlock (Face ID / fingerprint) is a **convenience feature only**. It is not a cryptographic root of trust.
- There is no password recovery. If you forget your master password, the data cannot be recovered.

## 4. Permissions

- **Biometrics / Face ID**: Used only to unlock the app for convenience. Optional.
- **Notifications** (optional): Local measurement and medication reminders only. Never used for marketing.

No other sensitive permissions are required.

## 5. Children’s privacy

Quenly is not directed at children under 13. We do not knowingly collect any data from children.

## 6. Not a medical device

Quenly is a **personal wellness and tracking tool only**.  
It is **not** a regulated medical device.  
It does **not** diagnose, treat, cure, or prevent any disease.  
It is **not** a substitute for professional medical advice, diagnosis, or treatment.

Always consult a qualified healthcare provider with questions about your blood pressure or health.

## 7. Changes to this policy

If this policy changes, the “Last updated” date will be revised. Continued use of the app after changes constitutes acceptance of the updated policy.

## 8. Contact

Questions about this privacy policy or the app can be sent to **stellarmatrixai@gmail.com**, or via the GitHub repository:  
https://github.com/BriteEnceladus/BP-tracker

---

**App Store / Play Store declaration guidance**

- **Privacy Nutrition Label (Apple):** Data Not Collected
- **Regulated medical device status:** No
- **Data safety (Google Play):** No data collected / shared
