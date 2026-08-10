import { BPReading, BPReadingInput } from '../src/schemas';
import {
  encryptData,
  decryptData,
  type EncryptedData as EncryptedPayload,
  type SessionCryptoKey,
} from './crypto'; // platform resolved (provides SessionCryptoKey)

/**
 * Per-reading encryption using the session master key (AES-256-GCM).
 *
 * Design:
 * - Each reading is independently encrypted as a JSON string.
 * - Uses the existing encryptData / decryptData (real AES-GCM on both platforms).
 * - Versioning via the EncryptedPayload (v1 currently).
 * - The master key never leaves memory.
 * - IV is unique per encryption (handled inside encryptData).
 */

export type EncryptedReadingPayload = EncryptedPayload; // { iv, payload } + future versioning

// Re-export for consumers (stores, tests, contexts)
export type { SessionCryptoKey } from './crypto';

/**
 * Encrypt a reading (or input) to an encrypted payload.
 * The resulting payload can be safely stored in Dexie / AsyncStorage.
 */
export async function encryptReading(
  reading: BPReading | BPReadingInput,
  key: SessionCryptoKey
): Promise<EncryptedReadingPayload> {
  const toEncrypt = { ...reading };
  const plaintext = JSON.stringify(toEncrypt);
  return encryptData(key, plaintext);
}

/**
 * Decrypt an encrypted reading payload back to BPReading.
 */
export async function decryptReading(
  payload: EncryptedReadingPayload,
  key: SessionCryptoKey
): Promise<BPReading> {
  const plaintext = await decryptData(key, payload);
  const parsed = JSON.parse(plaintext);

  if (!parsed || typeof parsed !== 'object' || !parsed.timestamp || typeof parsed.systolic !== 'number') {
    throw new Error('Decrypted data is not a valid reading');
  }

  return parsed as BPReading;
}

export async function encryptReadings(
  readings: (BPReading | BPReadingInput)[],
  key: SessionCryptoKey
): Promise<EncryptedReadingPayload[]> {
  return Promise.all(readings.map(r => encryptReading(r, key)));
}

export async function decryptReadings(
  payloads: EncryptedReadingPayload[],
  key: SessionCryptoKey
): Promise<BPReading[]> {
  const results: BPReading[] = [];
  for (const p of payloads) {
    try {
      const r = await decryptReading(p, key);
      results.push(r);
    } catch (e) {
      console.warn('[readingEncryption] Failed to decrypt one reading, skipping', e);
    }
  }
  return results;
}
