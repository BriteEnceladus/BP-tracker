import { Platform } from 'react-native';
import Dexie, { Table } from 'dexie';
import { BPReadingSchema, type BPReading as BPReadingType } from './schemas';

// Re-export the canonical type
export type BPReading = BPReadingType;

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
