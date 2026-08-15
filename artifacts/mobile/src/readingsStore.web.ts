/**
 * Web readings store with real per-reading AES-256-GCM encryption.
 * Uses Dexie + the readingEncryption layer.
 *
 * All data is encrypted with the session master key before storage.
 */
import { liveQuery } from 'dexie';
import { db } from './db';
import { BPReading, BPReadingInput } from './schemas';
import {
  encryptReading,
  decryptReading,
  type EncryptedReadingPayload,
  type SessionCryptoKey,
} from '../utils/readingEncryption';

export interface EncryptedStoredReading {
  id?: number;
  encrypted: EncryptedReadingPayload;
  createdAt?: string;
  updatedAt?: string;
}

export async function getAllReadings(key?: SessionCryptoKey): Promise<BPReading[]> {
  if (!key) {
    // During migration or unlocked check, return empty or handle
    console.warn('[readingsStore.web] No key provided for decryption');
    return [];
  }

  const stored = await db.readings.toArray() as any[];
  const decrypted: BPReading[] = [];

  for (const item of stored) {
    try {
      if (item.encrypted) {
        // New encrypted format
        const reading = await decryptReading(item.encrypted, key);
        decrypted.push({ ...reading, id: item.id });
      } else if (item.systolic !== undefined) {
        // Legacy plaintext (for migration)
        decrypted.push(item as BPReading);
      }
    } catch (e) {
      console.error('[readingsStore.web] Failed to decrypt reading', e);
    }
  }

  return decrypted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function subscribeToReadings(
  onNext: (readings: BPReading[]) => void,
  onError?: (err: any) => void,
  key?: SessionCryptoKey
) {
  const subscription = liveQuery(async () => {
    if (!key) return [];
    return getAllReadings(key);
  }).subscribe({
    next: onNext,
    error: onError,
  });
  return () => subscription.unsubscribe();
}

export async function addReading(
  data: BPReadingInput,
  key: SessionCryptoKey
): Promise<BPReading> {
  const now = new Date().toISOString();
  const reading: BPReading = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  const encrypted = await encryptReading(reading, key);

  const stored: EncryptedStoredReading = {
    encrypted,
    createdAt: now,
    updatedAt: now,
  };

  const id = await db.readings.add(stored as any);
  return { ...reading, id: id as number };
}

export async function updateReading(
  id: number,
  updates: Partial<BPReadingInput>,
  key: SessionCryptoKey
): Promise<void> {
  const existing = await db.readings.get(id) as any;
  if (!existing) throw new Error('Reading not found');

  let currentReading: BPReading;
  if (existing.encrypted) {
    currentReading = await decryptReading(existing.encrypted, key);
  } else {
    currentReading = existing as BPReading;
  }

  const updated = {
    ...currentReading,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const newEncrypted = await encryptReading(updated, key);

  await db.readings.put({
    ...existing,
    encrypted: newEncrypted,
    updatedAt: updated.updatedAt,
  });
}

export async function deleteReading(id: number, _key?: SessionCryptoKey): Promise<void> {
  await db.readings.delete(id);
}

export async function clearAllReadings(): Promise<void> {
  await db.readings.clear();
}
