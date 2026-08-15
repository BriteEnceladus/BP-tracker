import { Platform } from 'react-native';
import Dexie, { Table } from 'dexie';
import { type BPReading as BPReadingType } from './schemas';

export type BPReading = BPReadingType;

class BPTrackerDatabase extends Dexie {
  readings!: Table<BPReading, number>;

  constructor() {
    super('BPTrackerDB_v1');
    this.version(1).stores({
      readings: '++id, timestamp, systolic, diastolic',
    });
  }
}

export const db =
  Platform.OS === 'web' ? new BPTrackerDatabase() : (null as unknown as BPTrackerDatabase);

export async function clearAllData() {
  if (Platform.OS === 'web' && db) {
    await db.readings.clear();
  }
}
