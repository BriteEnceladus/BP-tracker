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

class BPTrackerDatabase extends Dexie {
  readings!: Table<BPReading, number>;

  constructor() {
    super('BPTrackerDB_v1');
    this.version(1).stores({
      readings: '++id, timestamp, systolic, diastolic' // Primary key + indexes for common queries
    });
  }
}

export const db = new BPTrackerDatabase();

// Optional: Clear database (useful during development)
export async function clearAllData() {
  await db.readings.clear();
}
