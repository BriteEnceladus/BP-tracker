import { Platform } from 'react-native';
import Dexie, { Table } from 'dexie';
import { type BPReading as BPReadingType } from './schemas';

export type BPReading = BPReadingType;

type EncryptedRow = { id?: number; encrypted: unknown; createdAt?: string; updatedAt?: string };

class BPTrackerDatabase extends Dexie {
  readings!: Table<BPReading, number>;
  glucose!: Table<EncryptedRow, number>;

  constructor() {
    super('BPTrackerDB_v1');
    this.version(1).stores({
      readings: '++id, timestamp, systolic, diastolic',
    });
    this.version(2).stores({
      readings: '++id, timestamp, systolic, diastolic',
      glucose: '++id',
    });
  }
}

export const db =
  Platform.OS === 'web' ? new BPTrackerDatabase() : (null as unknown as BPTrackerDatabase);

export async function clearAllData() {
  if (Platform.OS === 'web' && db) {
    await db.readings.clear();
    await db.glucose.clear();
  }
}
