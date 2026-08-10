/**
 * Web medications store — AsyncStorage (consistent with native for simplicity).
 * Can later move to Dexie if desired.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medication, MedicationInput } from './schemas';

const STORAGE_KEY = 'bp_medications_v1';

let memoryCache: Medication[] | null = null;
let nextId = 1;

async function load(): Promise<Medication[]> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryCache = [];
      return memoryCache;
    }
    const parsed: Medication[] = JSON.parse(raw);
    memoryCache = parsed;
    const maxId = parsed.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
    nextId = maxId + 1;
    return memoryCache;
  } catch (e) {
    console.warn('[medsStore.web] load failed', e);
    memoryCache = [];
    return memoryCache;
  }
}

async function persist(items: Medication[]): Promise<void> {
  memoryCache = items;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function getAllMedications(): Promise<Medication[]> {
  const all = await load();
  return [...all].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });
}

export async function addMedication(data: MedicationInput): Promise<Medication> {
  const all = await load();
  const now = new Date().toISOString();
  const item: Medication = {
    ...data,
    id: nextId++,
    active: data.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  all.push(item);
  await persist(all);
  return item;
}

export async function updateMedication(
  id: number,
  updates: Partial<MedicationInput>
): Promise<void> {
  const all = await load();
  const idx = all.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error('Medication not found');
  all[idx] = {
    ...all[idx],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  await persist(all);
}

export async function deleteMedication(id: number): Promise<void> {
  const all = await load();
  await persist(all.filter((m) => m.id !== id));
}

export async function clearAllMedications(): Promise<void> {
  memoryCache = [];
  nextId = 1;
  await AsyncStorage.removeItem(STORAGE_KEY);
}
