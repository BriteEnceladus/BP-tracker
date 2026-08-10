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

// Polyfill random values if not present (quick-crypto helps here)
import 'react-native-get-random-values'; // fallback safety for crypto.getRandomValues

// Make sure global crypto is available
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = QuickCrypto;
}

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

// ---------- Base64 helpers (binary safe) ----------

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
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
  return base64ToUint8Array(base64).buffer;
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64(salt.buffer as ArrayBuffer);
}

export async function deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
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
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  return {
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    payload: bufferToBase64(ciphertext),
  };
}

export async function decryptData(key: CryptoKey, data: EncryptedData): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(data.iv) },
    key,
    base64ToBuffer(data.payload)
  );
  return new TextDecoder().decode(plaintext);
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
  const hasMinLength = password.length >= 12;
  if (hasMinLength) score++;
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
