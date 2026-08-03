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

export interface Medication {
  id?: number;
  name: string;
  dosage: string;
  frequency: string; // e.g. "Once daily", "Twice daily", "As needed"
  startDate?: string; // ISO date
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class BPTrackerDatabase extends Dexie {
  readings!: Table<BPReading, number>;
  medications!: Table<Medication, number>;

  constructor() {
    super('BPTrackerDB_v1');
    this.version(1).stores({
      readings: '++id, timestamp, systolic, diastolic',
    });
    // Version 2 adds medications table
    this.version(2).stores({
      readings: '++id, timestamp, systolic, diastolic',
      medications: '++id, name, isActive',
    });
  }
}

export const db = new BPTrackerDatabase();

// Optional: Clear database (useful during development)
export async function clearAllData() {
  await db.readings.clear();
  await db.medications.clear();
}
