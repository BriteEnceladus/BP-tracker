/**
 * Native readings persistence with real per-reading AES-256-GCM encryption.
 * Uses AsyncStorage + the readingEncryption layer.
 *
 * Data is protected by the session crypto key (not just the lock gate).
 * clearMemoryCache() must be called on lock so plaintext does not linger.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BPReading, BPReadingInput } from './schemas';
import {
  encryptReading,
  decryptReading,
  type EncryptedReadingPayload,
  type SessionCryptoKey,
} from '../utils/readingEncryption';

const STORAGE_KEY = 'bp_readings_v2_encrypted';

let memoryCache: BPReading[] | null = null;
let nextId = 1;

export function clearMemoryCache(): void {
  memoryCache = null;
}

async function load(key?: SessionCryptoKey): Promise<BPReading[]> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryCache = [];
      return memoryCache;
    }

    const stored: any[] = JSON.parse(raw);
    const decrypted: BPReading[] = [];

    for (const item of stored) {
      try {
        if (item.encrypted) {
          if (!key) throw new Error('No key for decryption');
          const reading = await decryptReading(item.encrypted, key);
          decrypted.push({ ...reading, id: item.id });
        } else if (item.systolic !== undefined) {
          // Legacy plaintext during migration
          decrypted.push(item as BPReading);
        }
      } catch (e) {
        console.warn('[readingsStore.native] Failed to decrypt item', e);
      }
    }

    memoryCache = decrypted;
    const maxId = decrypted.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
    nextId = maxId + 1;
    return memoryCache;
  } catch (e) {
    console.warn('[readingsStore.native] load failed', e);
    memoryCache = [];
    return memoryCache;
  }
}

async function persist(readings: BPReading[], key: SessionCryptoKey): Promise<void> {
  memoryCache = readings;

  try {
    let toStore: any[];

    if (!key) {
      throw new Error('Session key required to persist readings');
    }

    toStore = await Promise.all(
      readings.map(async (r) => {
        const encrypted = await encryptReading(r, key);
        return {
          id: r.id,
          encrypted,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      })
    );

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.error('[readingsStore.native] persist failed', e);
    throw e;
  }
}

export async function getAllReadings(key?: SessionCryptoKey): Promise<BPReading[]> {
  const all = await load(key);
  return [...all].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function addReading(
  data: BPReadingInput,
  key: SessionCryptoKey
): Promise<BPReading> {
  const all = await load(key);
  const now = new Date().toISOString();
  const reading: BPReading = {
    ...data,
    id: nextId++,
    createdAt: now,
    updatedAt: now,
  };
  all.push(reading);
  await persist(all, key);
  return reading;
}

export async function updateReading(
  id: number,
  updates: Partial<BPReadingInput>,
  key: SessionCryptoKey
): Promise<void> {
  const all = await load(key);
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Reading not found');

  all[idx] = {
    ...all[idx],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  await persist(all, key);
}

export async function deleteReading(id: number, key: SessionCryptoKey): Promise<void> {
  const all = await load(key);
  const next = all.filter((r) => r.id !== id);
  await persist(next, key);
}

export async function clearAllReadings(): Promise<void> {
  memoryCache = null;
  nextId = 1;
  await AsyncStorage.removeItem(STORAGE_KEY);
}
