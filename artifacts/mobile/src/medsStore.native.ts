/**
 * Native medications persistence with per-record AES-256-GCM encryption.
 * Requires session crypto key for all read/write. Plaintext never written to disk.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medication, MedicationInput } from './schemas';
import {
  encryptData,
  decryptData,
  type SessionCryptoKey,
  type EncryptedData,
} from '../utils/crypto';

const STORAGE_KEY = 'bp_medications_v2_encrypted';

let memoryCache: Medication[] | null = null;
let nextId = 1;

async function encryptMed(med: Medication, key: SessionCryptoKey): Promise<{ id?: number; encrypted: EncryptedData }> {
  const { id, ...rest } = med;
  const encrypted = await encryptData(key, JSON.stringify(rest));
  return { id, encrypted };
}

async function decryptMed(
  item: { id?: number; encrypted?: EncryptedData; name?: string },
  key: SessionCryptoKey
): Promise<Medication | null> {
  try {
    if (item.encrypted) {
      const plain = await decryptData(key, item.encrypted);
      const parsed = JSON.parse(plain) as Medication;
      return { ...parsed, id: item.id };
    }
    // Legacy plaintext migration path
    if (item.name) {
      return item as Medication;
    }
  } catch (e) {
    console.warn('[medsStore.native] decrypt failed', e);
  }
  return null;
}

async function load(key: SessionCryptoKey): Promise<Medication[]> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Try legacy key once
      const legacy = await AsyncStorage.getItem('bp_medications_v1');
      if (legacy) {
        const parsed: Medication[] = JSON.parse(legacy);
        memoryCache = parsed;
        const maxId = parsed.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
        nextId = maxId + 1;
        // Re-persist encrypted and drop legacy
        await persist(parsed, key);
        await AsyncStorage.removeItem('bp_medications_v1');
        return memoryCache;
      }
      memoryCache = [];
      return memoryCache;
    }

    const stored: any[] = JSON.parse(raw);
    const decrypted: Medication[] = [];
    for (const item of stored) {
      const med = await decryptMed(item, key);
      if (med) decrypted.push(med);
    }
    memoryCache = decrypted;
    const maxId = decrypted.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
    nextId = maxId + 1;
    return memoryCache;
  } catch (e) {
    console.warn('[medsStore.native] load failed', e);
    memoryCache = [];
    return memoryCache;
  }
}

async function persist(items: Medication[], key: SessionCryptoKey): Promise<void> {
  memoryCache = items;
  const toStore = await Promise.all(items.map((m) => encryptMed(m, key)));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
}

export function clearMemoryCache(): void {
  memoryCache = null;
}

export async function getAllMedications(key: SessionCryptoKey): Promise<Medication[]> {
  const all = await load(key);
  return [...all].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });
}

export async function addMedication(
  data: MedicationInput,
  key: SessionCryptoKey
): Promise<Medication> {
  const all = await load(key);
  const now = new Date().toISOString();
  const item: Medication = {
    ...data,
    id: nextId++,
    active: data.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  all.push(item);
  await persist(all, key);
  return item;
}

export async function updateMedication(
  id: number,
  updates: Partial<MedicationInput>,
  key: SessionCryptoKey
): Promise<void> {
  const all = await load(key);
  const idx = all.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error('Medication not found');
  all[idx] = {
    ...all[idx],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  await persist(all, key);
}

export async function deleteMedication(id: number, key: SessionCryptoKey): Promise<void> {
  const all = await load(key);
  await persist(
    all.filter((m) => m.id !== id),
    key
  );
}

export async function clearAllMedications(): Promise<void> {
  memoryCache = null;
  nextId = 1;
  await AsyncStorage.removeItem(STORAGE_KEY);
  await AsyncStorage.removeItem('bp_medications_v1');
}
