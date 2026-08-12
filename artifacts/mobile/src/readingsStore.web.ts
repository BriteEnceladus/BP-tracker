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

/** Replace entire local dataset (used after cloud pull/merge). */
export async function replaceAllReadings(
  readings: BPReading[]
): Promise<void> {
  await db.transaction('rw', db.readings, async () => {
    await db.readings.clear();
    if (!readings.length) return;

    const withIds = readings.filter((r) => r.id != null);
    const withoutIds = readings.filter((r) => r.id == null);

    if (withIds.length) {
      await db.readings.bulkPut(withIds as BPReading[]);
    }
    if (withoutIds.length) {
      await db.readings.bulkAdd(withoutIds);
    }
  });
}
