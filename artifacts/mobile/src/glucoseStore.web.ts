/**
 * Web glucose store: Dexie + per-record AES-256-GCM. Canonical mg/dL.
 */
import { liveQuery } from 'dexie';
import { db } from './db';
import type { GlucoseReading, GlucoseReadingInput } from './schemas';
import {
  encryptGlucose,
  decryptGlucose,
  type SessionCryptoKey,
} from '../utils/glucoseEncryption';

export async function getAllGlucose(key?: SessionCryptoKey): Promise<GlucoseReading[]> {
  if (!key || !db) return [];
  const stored = (await db.glucose.toArray()) as Array<{
    id?: number;
    encrypted?: Parameters<typeof decryptGlucose>[0];
  }>;
  const decrypted: GlucoseReading[] = [];
  for (const item of stored) {
    try {
      if (!item.encrypted) continue;
      const reading = await decryptGlucose(item.encrypted, key);
      decrypted.push({ ...reading, id: item.id });
    } catch (e) {
      console.error('[glucoseStore.web] Failed to decrypt reading', e);
    }
  }
  return decrypted.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function subscribeToGlucose(
  onNext: (readings: GlucoseReading[]) => void,
  onError?: (err: unknown) => void,
  key?: SessionCryptoKey
) {
  const subscription = liveQuery(async () => {
    if (!key) return [];
    return getAllGlucose(key);
  }).subscribe({
    next: onNext,
    error: onError,
  });
  return () => subscription.unsubscribe();
}

export async function addGlucose(
  data: GlucoseReadingInput,
  key: SessionCryptoKey
): Promise<GlucoseReading> {
  const now = new Date().toISOString();
  const reading: GlucoseReading = { ...data, createdAt: now, updatedAt: now };
  const encrypted = await encryptGlucose(reading, key);
  const id = await db.glucose.add({ encrypted, createdAt: now, updatedAt: now } as never);
  return { ...reading, id: id as number };
}

export async function updateGlucose(
  id: number,
  updates: Partial<GlucoseReadingInput>,
  key: SessionCryptoKey
): Promise<void> {
  const existing = (await db.glucose.get(id)) as { encrypted?: Parameters<typeof decryptGlucose>[0] } | undefined;
  if (!existing) throw new Error('Glucose reading not found');
  if (!existing.encrypted) throw new Error('Glucose reading is not encrypted');
  const current = await decryptGlucose(existing.encrypted, key);
  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  const newEncrypted = await encryptGlucose(updated, key);
  await db.glucose.put({ id, encrypted: newEncrypted, updatedAt: updated.updatedAt } as never);
}

export async function deleteGlucose(id: number, _key?: SessionCryptoKey): Promise<void> {
  await db.glucose.delete(id);
}

export async function clearAllGlucose(): Promise<void> {
  await db.glucose.clear();
}

export function clearMemoryCache(): void {
  // Web uses Dexie; nothing in-process to wipe besides React state.
}
