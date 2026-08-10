# Security Model for BP Tracker

**Version**: Post per-reading encryption implementation (2026)

BP Tracker is a fully client-side, privacy-first health data application. All sensitive user data is encrypted on the device using strong cryptography. There is no server, no account, and no cloud component.

## Core Cryptography

- **Algorithm**: AES-256-GCM (authenticated encryption with associated data)
- **Key Derivation**: PBKDF2-HMAC-SHA-256 with **100,000 iterations**
- **Key Length**: 256 bits
- **IV/Nonce**: 12 bytes (96 bits), cryptographically random per encryption operation (never reused)
- **Platforms**:
  - **Web**: Native Web Crypto API (`crypto.subtle`)
  - **Native (iOS/Android)**: `react-native-quick-crypto` (Web Crypto compatible implementation providing real AES-GCM)

The derived master key lives **only in React component state / memory** for the current unlocked session. It is never persisted to disk, SecureStore, IndexedDB, or anywhere else.

## What Is Protected

- Every individual blood pressure reading is encrypted **independently** with the master key before being written to storage.
- The master password itself is never stored.
- A password verifier (encrypted known plaintext) is used only to validate the password during unlock.

## Storage

- **Web**: Dexie.js (IndexedDB). Each reading is stored as an encrypted payload (`{ iv, payload }`).
- **Native**: `@react-native-async-storage/async-storage` (or SecureStore for biometric wrapper). Same encrypted payload format.
- Salt and password verifier are stored in plaintext (they are not secret).

## Authentication & Unlock

### Master Password
- Minimum 12 characters enforced at setup.
- Password strength meter with progressive feedback.
- No password recovery mechanism (by design — recovery would require weakening the model).

### Biometric Unlock (Convenience Feature Only)
- **Never** a cryptographic root of trust.
- **Web**: Stores the master password (encrypted under a fixed weak derivation key) in AsyncStorage. Any script on the same origin can access it.
- **Native**: Stores the master password in `expo-secure-store` protected by `requireAuthentication: true`. The OS biometric/passcode gate protects retrieval of the password.
- Biometrics only retrieve the password so the normal unlock path can derive the real master key.

**Explicit Warning**: Biometric unlock should only be used on trusted, up-to-date devices. It provides convenience, not additional security against a compromised device or malicious app on the same origin.

## Key Hierarchy

1. User master password (never stored)
2. PBKDF2 → Master `CryptoKey` (memory only, session-scoped)
3. Master key encrypts:
   - Individual readings (JSON → AES-GCM)
   - Password verifier (for unlock validation)
4. Biometric path (separate, weak convenience layer) can surface the password

## Encryption of Readings (Per-Record)

Each reading is serialized to JSON and encrypted with `encryptData(masterKey, json)`.

The resulting payload contains:
- `iv`: base64 random 12-byte nonce
- `payload`: base64 ciphertext + authentication tag (produced by AES-GCM)

Decryption verifies the authentication tag. Tampering or wrong key causes failure.

## Data Export

CSV export produces **plaintext** files (for usability with spreadsheets). Users are responsible for the security of exported data.

## Threat Model

**Protected against**:
- Passive theft of device storage (phone lost, disk imaged) while the app is locked.
- Unauthorized access while the app is backgrounded/locked (auto-lock + session key cleared).
- Casual inspection of app data directories.

**Not protected against** (by design):
- An attacker who obtains the master password (phishing, shoulder-surfing, keylogger on the device).
- Malware running with the same privileges as the app while it is unlocked (the key is in memory).
- Device compromise while the app is unlocked.
- Biometric bypass on a compromised device (especially web).
- Physical access while the app is unlocked.
- Side-channel attacks on the implementation.

## Migration

A one-time migration runs automatically the first time a user unlocks after upgrading.

- Detects legacy plaintext readings (v1 storage).
- Encrypts them under the current master key.
- Writes the new v2 encrypted format.
- Idempotent and non-destructive (old data is not deleted until new encrypted data is successfully persisted).

## Limitations & Honest Assessment

- **Fully client-side**: Security is entirely dependent on the strength of the user's master password and the security of their device.
- Biometric convenience on web is particularly weak.
- No forward secrecy for old readings if the password is later compromised.
- No encrypted backup/export feature (CSV is plaintext).
- The native implementation relies on `react-native-quick-crypto`; users should keep the library updated.
- No code obfuscation or anti-tamper measures (standard for this class of app).

## Deployment Recommendations

- Web/PWA: Must be served exclusively over HTTPS.
- Use a strict Content-Security-Policy.
- Keep Expo/React Native and all dependencies (especially crypto-related) up to date.
- On Android/iOS: Use the latest OS and enable biometric + strong device passcode.

## Versioning & Algorithm Agility

The `EncryptedPayload` format is versioned (`v: 1`). Future versions can introduce new algorithms or key rotation while maintaining backward compatibility through the migration layer.

---

**Last updated**: After implementation of per-reading AES-256-GCM encryption (current session)  
**Previous claims** in older documentation about "per-record encryption" referred to aspirational / incomplete state. This document reflects the actual implementation.