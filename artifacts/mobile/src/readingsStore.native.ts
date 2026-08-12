/**
 * Native readings persistence using AsyncStorage.
 * Same shape as the web Dexie store so BPContext API stays identical.
 * Data is protected by the CryptoContext unlock gate.
 * TODO: encrypt the stored JSON with the session crypto key for at-rest protection.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BPReading } from './db';

const STORAGE_KEY = 'bp_readings_v1';

let memoryCache: BPReading[] | null = null;
let nextId = 1;

async function load(): Promise<BPReading[]> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryCache = [];
      return memoryCache;
    }
    const parsed: BPReading[] = JSON.parse(raw);
    memoryCache = parsed;
    // Keep nextId higher than any existing id
    const maxId = parsed.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
    nextId = maxId + 1;
    return memoryCache;
  } catch (e) {
    console.warn('[readingsStore.native] load failed', e);
    memoryCache = [];
    return memoryCache;
  }
}

async function persist(readings: BPReading[]): Promise<void> {
  memoryCache = readings;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
  } catch (e) {
    console.error('[readingsStore.native] persist failed', e);
    throw e;
  }
}

export async function getAllReadings(): Promise<BPReading[]> {
  const all = await load();
  // Newest first (same as Dexie orderBy('timestamp').reverse())
  return [...all].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function addReading(
  data: Omit<BPReading, 'id' | 'createdAt' | 'updatedAt'>
): Promise<BPReading> {
  const all = await load();
  const now = new Date().toISOString();
  const reading: BPReading = {
    ...data,
    id: nextId++,
    createdAt: now,
    updatedAt: now,
  };
  all.push(reading);
  await persist(all);
  return reading;
}

export async function updateReading(
  id: number,
  updates: Partial<BPReading>
): Promise<void> {
  const all = await load();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Reading not found');
  all[idx] = {
    ...all[idx],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  await persist(all);
}

export async function deleteReading(id: number): Promise<void> {
  const all = await load();
  const next = all.filter((r) => r.id !== id);
  await persist(next);
}

export async function clearAllReadings(): Promise<void> {
  memoryCache = [];
  nextId = 1;
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** Replace entire local dataset (used after cloud pull/merge). */
export async function replaceAllReadings(
  readings: BPReading[]
): Promise<void> {
  const normalized = readings.map((r, i) => ({
    ...r,
    id: r.id ?? i + 1,
  }));
  const maxId = normalized.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
  nextId = maxId + 1;
  await persist(normalized);
}
