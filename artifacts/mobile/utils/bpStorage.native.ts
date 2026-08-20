/**
 * Native storage layer for encryption setup / unlock / biometric convenience.
 * Uses expo-secure-store for all sensitive material.
 * Biometrics (expo-local-authentication) are convenience only.
 *
 * Now uses real AES-256-GCM from crypto.native (via react-native-quick-crypto).
 */
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  generateSalt,
  deriveKey,
  createVerifier,
  verifyKey,
  type EncryptedData,
} from './crypto.native';

const SALT_KEY = 'bp_enc_salt';
const VERIFIER_KEY = 'bp_enc_verifier';
const BIO_PASSWORD_KEY = 'bp_bio_password'; // encrypted master password for biometric convenience

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function isEncryptionSetup(): Promise<boolean> {
  const salt = await SecureStore.getItemAsync(SALT_KEY);
  const verifier = await SecureStore.getItemAsync(VERIFIER_KEY);
  return !!(salt && verifier);
}

export async function setupEncryption(password: string): Promise<CryptoKey> {
  const salt = generateSalt(); // sync
  const key = await deriveKey(password, salt);
  const verifier = await createVerifier(key);

  await SecureStore.setItemAsync(SALT_KEY, salt, secureOptions);
  await SecureStore.setItemAsync(VERIFIER_KEY, JSON.stringify(verifier), secureOptions);

  return key;
}

export async function unlockWithPassword(password: string): Promise<CryptoKey | null> {
  const salt = await SecureStore.getItemAsync(SALT_KEY);
  const verifierRaw = await SecureStore.getItemAsync(VERIFIER_KEY);
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
  const newSalt = generateSalt();
  const newKey = await deriveKey(newPassword, newSalt);
  const newVerifier = await createVerifier(newKey);

  await SecureStore.setItemAsync(SALT_KEY, newSalt, secureOptions);
  await SecureStore.setItemAsync(VERIFIER_KEY, JSON.stringify(newVerifier), secureOptions);

  return newKey;
}

// ---------- Biometric convenience ----------

export async function isBiometricSupported(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function isBiometricEnrolled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIO_PASSWORD_KEY);
  return !!value;
}

export async function enrollBiometric(masterPassword: string): Promise<void> {
  // Store the master password itself in SecureStore (protected by device biometrics / passcode).
  // This is the standard "convenience" pattern: biometrics only unlock the already-encrypted store.
  await SecureStore.setItemAsync(BIO_PASSWORD_KEY, masterPassword, {
    ...secureOptions,
    requireAuthentication: true,
    authenticationPrompt: 'Authenticate to enable biometric unlock',
  });
}

export async function authenticateWithBiometric(): Promise<string | null> {
  try {
    // requireAuthentication on the item will trigger the system biometric prompt
    const password = await SecureStore.getItemAsync(BIO_PASSWORD_KEY, {
      requireAuthentication: true,
      authenticationPrompt: 'Unlock BP Tracker',
    });
    return password;
  } catch {
    return null;
  }
}

export async function updateBiometricPassword(newPassword: string): Promise<void> {
  await enrollBiometric(newPassword);
}

export async function removeBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(BIO_PASSWORD_KEY);
}
