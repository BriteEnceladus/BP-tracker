# Security Model & Hardening for BP Tracker

## Overview
BP Tracker is a **client-side only** health data application. All blood pressure readings are encrypted locally before being stored.

## Encryption Architecture (Web)

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2 (SHA-256, 100,000 iterations)
- **Key Storage**: Derived `CryptoKey` lives **only in React memory** for the session. Never persisted.
- **Storage**: Dexie.js + IndexedDB with per-record encryption
- **Salt & Verifier**: Stored in `meta` table (salt + encrypted known plaintext verifier)

## Biometric Unlock (Web)

- Uses WebAuthn platform authenticator as a **convenience gate** only.
- A non-extractable AES-GCM "wrapper key" is stored in Dexie `bioKeys`.
- WebAuthn proves user presence/intent — it does **not** derive the master key.
- This model is required because WebAuthn PRF extension is not supported on iOS Safari.

**Important**: Biometrics are **not** a cryptographic root of trust. Any JavaScript running on the origin can access the wrapper key in IndexedDB.

## Security Hardening Applied (June 2026)

- Robust binary-safe base64 encoding (prevents potential corruption)
- Minimum 12-character password enforced during setup
- Password strength meter updated with better feedback
- Stricter setup validation (requires "Good" strength or higher)

## Recommended Best Practices for Users

1. Use a **strong, unique master password** (12+ characters recommended)
2. There is **no password recovery** — if you forget it, data is permanently lost
3. Keep your device and browser updated
4. Consider enabling biometric unlock only on trusted devices
5. Regularly export your data as encrypted backup (feature in development)

## Deployment Recommendations (PWA/Web)

- Always serve over **HTTPS**
- Use strict Content-Security-Policy
- Consider Subresource Integrity for scripts

## Known Limitations

- Client-side encryption means security depends entirely on the user's password and device security.
- No server-side component in v1 (fully local).
- Biometric unlock is convenience-only.

---

*Last updated: June 2026*