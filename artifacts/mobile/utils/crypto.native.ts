/**
 * Native crypto helpers using react-native-quick-crypto.
 * Provides real AES-256-GCM (authenticated encryption) + PBKDF2 for consistency with web.
 *
 * - Uses the library's Web Crypto compatible API (subtle).
 * - Master key (CryptoKey) lives only in memory.
 * - IV is always 12 bytes (96 bits), randomly generated per encryption.
 * - All operations are binary-safe.
 * - This replaces the previous non-GCM HMAC-based verifier.
 */

import QuickCrypto from 'react-native-quick-crypto';
import Constants from 'expo-constants';

// Polyfill random values if not present
import 'react-native-get-random-values';

type SubtleSurface = {
  importKey: (
    format: string,
    keyData: BufferSource,
    algorithm: AlgorithmIdentifier,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ) => Promise<CryptoKey>;
  deriveKey: (
    algorithm: Pbkdf2Params,
    baseKey: CryptoKey,
    derivedKeyType: AesKeyGenParams,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ) => Promise<CryptoKey>;
  encrypt: (
    algorithm: AesGcmParams,
    key: CryptoKey,
    data: BufferSource
  ) => Promise<ArrayBuffer>;
  decrypt: (
    algorithm: AesGcmParams,
    key: CryptoKey,
    data: BufferSource
  ) => Promise<ArrayBuffer>;
};

type NativeCryptoApi = {
  getRandomValues: (arr: Uint8Array) => Uint8Array;
  subtle: SubtleSurface;
};

type AnyCrypto = {
  getRandomValues?: (arr: Uint8Array) => Uint8Array;
  subtle?: Partial<SubtleSurface>;
  install?: () => void;
  webcrypto?: AnyCrypto;
};

function isUsableSubtle(c: AnyCrypto | undefined | null): c is NativeCryptoApi {
  return Boolean(
    c &&
      typeof c.getRandomValues === 'function' &&
      c.subtle &&
      typeof c.subtle.importKey === 'function' &&
      typeof c.subtle.deriveKey === 'function' &&
      typeof c.subtle.encrypt === 'function' &&
      typeof c.subtle.decrypt === 'function'
  );
}

function pickQuickCryptoSurface(): AnyCrypto | null {
  const qc = QuickCrypto as unknown as AnyCrypto;
  if (isUsableSubtle(qc)) return qc;
  if (isUsableSubtle(qc?.webcrypto)) return qc.webcrypto ?? null;
  if (qc && typeof qc.install === 'function') {
    try {
      qc.install();
    } catch {
      // Expo Go or missing native binary — ensureNativeCrypto reports this.
    }
  }
  const after = (global as unknown as { crypto?: AnyCrypto }).crypto;
  if (isUsableSubtle(after)) return after;
  if (isUsableSubtle(qc)) return qc;
  if (qc?.subtle) return qc;
  return qc ?? null;
}

/**
 * RN / Expo often define a stub global.crypto (getRandomValues only) before this
 * module loads. Replacing only when crypto is undefined left AES-GCM missing on
 * real APKs and made setup look like an Expo Go failure.
 */
function installNativeCrypto(): NativeCryptoApi | null {
  const surface = pickQuickCryptoSurface();
  const g = global as unknown as { crypto?: AnyCrypto };

  if (surface && !isUsableSubtle(g.crypto)) {
    if (!g.crypto) {
      g.crypto = surface;
    } else {
      if (surface.subtle) g.crypto.subtle = surface.subtle;
      if (typeof g.crypto.getRandomValues !== 'function' && typeof surface.getRandomValues === 'function') {
        g.crypto.getRandomValues = surface.getRandomValues.bind(surface);
      }
    }
  }

  if (isUsableSubtle(g.crypto)) return g.crypto;
  if (isUsableSubtle(surface)) return surface;
  return null;
}

let nativeCrypto: NativeCryptoApi | null = installNativeCrypto();

export type SessionCryptoKey = CryptoKey;

export interface EncryptedData {
  iv: string;
  payload: string;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  feedback: string;
}

function runningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

function ensureNativeCrypto(): NativeCryptoApi {
  if (isUsableSubtle(nativeCrypto)) return nativeCrypto;
  nativeCrypto = installNativeCrypto();
  if (isUsableSubtle(nativeCrypto)) return nativeCrypto;
  if (runningInExpoGo()) {
    throw new Error(
      'This screen is running inside Expo Go, which cannot encrypt data. Open the installed BP Tracker app from your home screen (not Expo Go), or install the APK from EAS / Play.'
    );
  }
  throw new Error(
    'Encryption is not ready in this install. Uninstall Expo Go copies of the project, open the BP Tracker icon from your home screen, and if it still fails install a fresh preview/production APK (not a QR scan into Expo Go).'
  );
}

function cryptoApi(): NativeCryptoApi {
  return ensureNativeCrypto();
}

// ---------- Base64 helpers (binary safe) ----------

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  return uint8ArrayToBase64(new Uint8Array(buffer));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const bytes = base64ToUint8Array(base64);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function generateSalt(): string {
  const c = cryptoApi();
  const salt = c.getRandomValues(new Uint8Array(16));
  return bufferToBase64(salt.buffer as ArrayBuffer);
}

export async function deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const c = cryptoApi();
  const enc = new TextEncoder();
  const keyMaterial = await c.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return c.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBuffer(saltBase64),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(key: CryptoKey, plaintext: string): Promise<EncryptedData> {
  const c = cryptoApi();
  const iv = c.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await c.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  return {
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    payload: bufferToBase64(ciphertext as ArrayBuffer),
  };
}

export async function decryptData(key: CryptoKey, data: EncryptedData): Promise<string> {
  const c = cryptoApi();
  const plaintext = await c.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(data.iv) },
    key,
    base64ToBuffer(data.payload)
  );
  return new TextDecoder().decode(plaintext as ArrayBuffer);
}

const VERIFIER_TEXT = 'BP_TRACKER_V1_OK';

export async function createVerifier(key: CryptoKey): Promise<EncryptedData> {
  return encryptData(key, VERIFIER_TEXT);
}

export async function verifyKey(key: CryptoKey, verifier: EncryptedData): Promise<boolean> {
  try {
    const result = await decryptData(key, verifier);
    return result === VERIFIER_TEXT;
  } catch {
    return false;
  }
}

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  score = Math.min(4, score);

  const levels = [
    { label: 'Weak', color: '#EF4444', feedback: 'Use at least 12 characters with mixed case, numbers & symbols' },
    { label: 'Fair', color: '#F97316', feedback: 'Add more length and variety (uppercase, numbers, symbols)' },
    { label: 'Good', color: '#EAB308', feedback: 'Good — consider making it longer for better security' },
    { label: 'Strong', color: '#22C55E', feedback: 'Strong password!' },
    { label: 'Very Strong', color: '#16A34A', feedback: 'Excellent — very secure!' },
  ];

  return { score: score as 0 | 1 | 2 | 3 | 4, ...levels[score] };
}
