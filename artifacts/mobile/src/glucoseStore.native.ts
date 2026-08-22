/**
 * Native glucose persistence with per-record AES-256-GCM.
 * Canonical storage is mg/dL. clearMemoryCache() on lock.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GlucoseReading, GlucoseReadingInput } from './schemas';
import {
  encryptGlucose,
  decryptGlucose,
  type SessionCryptoKey,
} from '../utils/glucoseEncryption';

const STORAGE_KEY = 'bp_glucose_v1_encrypted';

let memoryCache: GlucoseReading[] | null = null;
let nextId = 1;

export function clearMemoryCache(): void {
  memoryCache = null;
}

async function load(key?: SessionCryptoKey): Promise<GlucoseReading[]> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryCache = [];
      return memoryCache;
    }
    const stored: Array<{ id?: number; encrypted?: unknown }> = JSON.parse(raw);
    const decrypted: GlucoseReading[] = [];
    for (const item of stored) {
      try {
        if (!item.encrypted || !key) continue;
        const reading = await decryptGlucose(item.encrypted as Parameters<typeof decryptGlucose>[0], key);
        decrypted.push({ ...reading, id: item.id });
      } catch (e) {
        console.warn('[glucoseStore.native] Failed to decrypt item', e);
      }
    }
    memoryCache = decrypted;
    const maxId = decrypted.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
    nextId = maxId + 1;
    return memoryCache;
  } catch (e) {
    console.warn('[glucoseStore.native] load failed', e);
    memoryCache = [];
    return memoryCache;
  }
}

async function persist(readings: GlucoseReading[], key: SessionCryptoKey): Promise<void> {
  memoryCache = readings;
  const toStore = await Promise.all(
    readings.map(async (r) => ({
      id: r.id,
      encrypted: await encryptGlucose(r, key),
    }))
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
}

export async function getAllGlucose(key?: SessionCryptoKey): Promise<GlucoseReading[]> {
  const all = await load(key);
  return [...all].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function addGlucose(
  data: GlucoseReadingInput,
  key: SessionCryptoKey
): Promise<GlucoseReading> {
  const all = await load(key);
  const now = new Date().toISOString();
  const reading: GlucoseReading = {
    ...data,
    id: nextId++,
    createdAt: now,
    updatedAt: now,
  };
  all.push(reading);
  await persist(all, key);
  return reading;
}

export async function updateGlucose(
  id: number,
  updates: Partial<GlucoseReadingInput>,
  key: SessionCryptoKey
): Promise<void> {
  const all = await load(key);
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Glucose reading not found');
  all[idx] = {
    ...all[idx],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  await persist(all, key);
}

export async function deleteGlucose(id: number, key: SessionCryptoKey): Promise<void> {
  const all = await load(key);
  await persist(
    all.filter((r) => r.id !== id),
    key
  );
}

export async function clearAllGlucose(): Promise<void> {
  memoryCache = null;
  nextId = 1;
  await AsyncStorage.removeItem(STORAGE_KEY);
}
