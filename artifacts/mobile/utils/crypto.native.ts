/**
 * Native crypto: prefer react-native-quick-crypto (AES-256-GCM + PBKDF2).
 * Play/EAS builds on RN New Architecture often fail to load QuickCrypto 0.7.x.
 * Fall back to @noble/hashes + @noble/ciphers with the same parameters so
 * password setup works without the native .so. Same EncryptedData shape.
 */

import QuickCrypto from 'react-native-quick-crypto';
import * as ExpoCrypto from 'expo-crypto';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import { gcm } from '@noble/ciphers/aes';
import 'react-native-get-random-values';

const PBKDF2_ITERS = 100_000;

type NobleKey = { __bpNoble: true; raw: Uint8Array };

export type SessionCryptoKey = CryptoKey | NobleKey;

function isNobleKey(key: SessionCryptoKey): key is NobleKey {
  return typeof key === 'object' && key !== null && (key as NobleKey).__bpNoble === true;
}

type SubtleSurface = {
  importKey: (...args: never[]) => Promise<CryptoKey>;
  deriveKey: (...args: never[]) => Promise<CryptoKey>;
  encrypt: (...args: never[]) => Promise<ArrayBuffer>;
  decrypt: (...args: never[]) => Promise<ArrayBuffer>;
};

type NativeCryptoApi = {
  getRandomValues: (arr: Uint8Array) => Uint8Array;
  subtle: SubtleSurface;
};

type AnyCrypto = {
  getRandomValues?: (arr: Uint8Array) => Uint8Array;
  subtle?: Partial<SubtleSurface> & Record<string, unknown>;
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
  try {
    const qc = QuickCrypto as unknown as AnyCrypto;
    if (isUsableSubtle(qc)) return qc;
    if (isUsableSubtle(qc?.webcrypto)) return qc.webcrypto ?? null;
    if (qc && typeof qc.install === 'function') {
      try {
        qc.install();
      } catch {
        /* native .so missing */
      }
    }
    const after = (global as unknown as { crypto?: AnyCrypto }).crypto;
    if (isUsableSubtle(after)) return after;
    if (isUsableSubtle(qc)) return qc;
    return qc ?? null;
  } catch {
    return null;
  }
}

function installNativeCrypto(): NativeCryptoApi | null {
  const surface = pickQuickCryptoSurface();
  const g = global as unknown as { crypto?: AnyCrypto };
  if (surface && !isUsableSubtle(g.crypto)) {
    if (!g.crypto) g.crypto = surface;
    else {
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

function randomBytes(n: number): Uint8Array {
  try {
    return ExpoCrypto.getRandomBytes(n);
  } catch {
    const buf = new Uint8Array(n);
    if (typeof global.crypto?.getRandomValues === 'function') {
      global.crypto.getRandomValues(buf);
      return buf;
    }
    throw new Error('No secure random source on this device.');
  }
}

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

function useNative(): NativeCryptoApi | null {
  if (isUsableSubtle(nativeCrypto)) return nativeCrypto;
  nativeCrypto = installNativeCrypto();
  return isUsableSubtle(nativeCrypto) ? nativeCrypto : null;
}

export function generateSalt(): string {
  const c = useNative();
  if (c) {
    const salt = c.getRandomValues(new Uint8Array(16));
    return bufferToBase64(salt.buffer as ArrayBuffer);
  }
  return uint8ArrayToBase64(randomBytes(16));
}

export async function deriveKey(password: string, saltBase64: string): Promise<SessionCryptoKey> {
  const c = useNative();
  if (c) {
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
        iterations: PBKDF2_ITERS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  const raw = pbkdf2(sha256, password, base64ToUint8Array(saltBase64), {
    c: PBKDF2_ITERS,
    dkLen: 32,
  });
  return { __bpNoble: true, raw };
}

export async function encryptData(key: SessionCryptoKey, plaintext: string): Promise<EncryptedData> {
  if (isNobleKey(key)) {
    const iv = randomBytes(12);
    const aes = gcm(key.raw, iv);
    const payload = aes.encrypt(new TextEncoder().encode(plaintext));
    return { iv: uint8ArrayToBase64(iv), payload: uint8ArrayToBase64(payload) };
  }
  const c = useNative();
  if (!c) throw new Error('Encryption backend missing.');
  const iv = c.getRandomValues(new Uint8Array(12));
  const ciphertext = await c.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    payload: bufferToBase64(ciphertext as ArrayBuffer),
  };
}

export async function decryptData(key: SessionCryptoKey, data: EncryptedData): Promise<string> {
  if (isNobleKey(key)) {
    const aes = gcm(key.raw, base64ToUint8Array(data.iv));
    const plain = aes.decrypt(base64ToUint8Array(data.payload));
    return new TextDecoder().decode(plain);
  }
  const c = useNative();
  if (!c) throw new Error('Encryption backend missing.');
  const plaintext = await c.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(data.iv) },
    key,
    base64ToBuffer(data.payload)
  );
  return new TextDecoder().decode(plaintext as ArrayBuffer);
}

const VERIFIER_TEXT = 'BP_TRACKER_V1_OK';

export async function createVerifier(key: SessionCryptoKey): Promise<EncryptedData> {
  return encryptData(key, VERIFIER_TEXT);
}

export async function verifyKey(key: SessionCryptoKey, verifier: EncryptedData): Promise<boolean> {
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
