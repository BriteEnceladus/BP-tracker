import { Platform } from 'react-native';
import Dexie, { Table } from 'dexie';

export interface BPReading {
  id?: number;
  timestamp: string; // ISO 8601 string
  systolic: number;
  diastolic: number;
  heartRate?: number;
  notes?: string;
  medicationTaken?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ---------- Web only (Dexie / IndexedDB) ----------
class BPTrackerDatabase extends Dexie {
  readings!: Table<BPReading, number>;

  constructor() {
    super('BPTrackerDB_v1');
    this.version(1).stores({
      readings: '++id, timestamp, systolic, diastolic',
    });
  }
}

// Only instantiate Dexie on web to avoid native crashes
export const db =
  Platform.OS === 'web' ? new BPTrackerDatabase() : (null as unknown as BPTrackerDatabase);

export async function clearAllData() {
  if (Platform.OS === 'web' && db) {
    await db.readings.clear();
  }
}
