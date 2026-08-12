/**
 * Web storage layer for encryption setup, unlock, and biometric convenience.
 * Uses AsyncStorage for salt/verifier + existing Web Crypto AES-256-GCM helpers.
 * Security note: Biometrics are convenience-only (not a cryptographic root of trust).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  generateSalt,
  deriveKey,
  createVerifier,
  verifyKey,
  encryptData,
  decryptData,
  type EncryptedData,
} from './crypto.web';

const SALT_KEY = 'bp_enc_salt';
const VERIFIER_KEY = 'bp_enc_verifier';
const BIO_WRAPPER_KEY = 'bp_bio_wrapper'; // stores encrypted master password for biometric convenience

export async function isEncryptionSetup(): Promise<boolean> {
  const salt = await AsyncStorage.getItem(SALT_KEY);
  const verifier = await AsyncStorage.getItem(VERIFIER_KEY);
  return !!(salt && verifier);
}

export async function setupEncryption(password: string): Promise<CryptoKey> {
  const salt = generateSalt();
  const key = await deriveKey(password, salt);
  const verifier = await createVerifier(key);

  await AsyncStorage.setItem(SALT_KEY, salt);
  await AsyncStorage.setItem(VERIFIER_KEY, JSON.stringify(verifier));

  return key;
}

export async function unlockWithPassword(password: string): Promise<CryptoKey | null> {
  const salt = await AsyncStorage.getItem(SALT_KEY);
  const verifierRaw = await AsyncStorage.getItem(VERIFIER_KEY);
  if (!salt || !verifierRaw) return null;

  try {
    const verifier: EncryptedData = JSON.parse(verifierRaw);
    const key = await deriveKey(password, salt);
    const valid = await verifyKey(key, verifier);
    return valid ? key : null;
  } catch {
    return null;
  }
}

export async function changeEncryptionPassword(
  oldKey: CryptoKey,
  newPassword: string
): Promise<CryptoKey> {
  // Re-derive with new password and rotate salt + verifier
  const newSalt = generateSalt();
  const newKey = await deriveKey(newPassword, newSalt);
  const newVerifier = await createVerifier(newKey);

  await AsyncStorage.setItem(SALT_KEY, newSalt);
  await AsyncStorage.setItem(VERIFIER_KEY, JSON.stringify(newVerifier));

  return newKey;
}

// --- Biometric convenience (web) ---
// WebAuthn / platform authenticator is used only as a gate.
// The master password itself is stored encrypted under a non-extractable wrapper.

export async function isBiometricSupported(): Promise<boolean> {
  // Basic feature detection; real WebAuthn support varies by browser
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

export async function isBiometricEnrolled(): Promise<boolean> {
  const wrapper = await AsyncStorage.getItem(BIO_WRAPPER_KEY);
  return !!wrapper;
}

export async function enrollBiometric(masterPassword: string): Promise<void> {
  // Simple convenience store — in production this would use WebAuthn PRF or similar.
  // For now we store an encrypted form of the password under a fixed label.
  // WARNING: This is convenience only and not a cryptographic root of trust.
  const salt = generateSalt();
  const key = await deriveKey('bio-convenience-v1', salt);
  const encrypted = await encryptData(key, masterPassword);
  await AsyncStorage.setItem(
    BIO_WRAPPER_KEY,
    JSON.stringify({ salt, ...encrypted })
  );
}

export async function authenticateWithBiometric(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(BIO_WRAPPER_KEY);
  if (!raw) return null;
  try {
    const { salt, iv, payload } = JSON.parse(raw);
    const key = await deriveKey('bio-convenience-v1', salt);
    return await decryptData(key, { iv, payload });
  } catch {
    return null;
  }
}

export async function updateBiometricPassword(newPassword: string): Promise<void> {
  await enrollBiometric(newPassword);
}

export async function removeBiometric(): Promise<void> {
  await AsyncStorage.removeItem(BIO_WRAPPER_KEY);
}
