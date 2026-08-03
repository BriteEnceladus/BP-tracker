/**
 * Web readings store — thin wrapper around Dexie so BPContext can use the same API.
 */
import { liveQuery } from 'dexie';
import { db, BPReading } from './db';

export async function getAllReadings(): Promise<BPReading[]> {
  return db.readings.orderBy('timestamp').reverse().toArray();
}

export function subscribeToReadings(
  onNext: (readings: BPReading[]) => void,
  onError?: (err: any) => void
) {
  const subscription = liveQuery(() =>
    db.readings.orderBy('timestamp').reverse().toArray()
  ).subscribe({
    next: onNext,
    error: onError,
  });
  return () => subscription.unsubscribe();
}

export async function addReading(
  data: Omit<BPReading, 'id' | 'createdAt' | 'updatedAt'>
): Promise<BPReading> {
  const now = new Date().toISOString();
  const reading: BPReading = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  const id = await db.readings.add(reading);
  return { ...reading, id: id as number };
}

export async function updateReading(
  id: number,
  updates: Partial<BPReading>
): Promise<void> {
  const existing = await db.readings.get(id);
  if (!existing) throw new Error('Reading not found');
  await db.readings.put({
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteReading(id: number): Promise<void> {
  await db.readings.delete(id);
}

export async function clearAllReadings(): Promise<void> {
  await db.readings.clear();
}
