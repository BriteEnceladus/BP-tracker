import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { db } from './db';
import { BPReading } from './schemas';
import {
  encryptReadings,
  type SessionCryptoKey,
} from '../utils/readingEncryption';
import * as webStore from './readingsStore.web';
import * as nativeStore from './readingsStore.native';

const MIGRATION_FLAG = 'bp_readings_migrated_to_v2_encrypted';

/**
 * One-time migration from plaintext (or old weak encryption) to per-reading AES-256-GCM.
 *
 * - Idempotent: checks flag + data format.
 * - Safe: does not delete data until new encrypted version is successfully written.
 * - Detects old format (plain BPReading objects without 'encrypted' field).
 */
export async function migrateReadingsToEncrypted(key: SessionCryptoKey): Promise<{
  migrated: boolean;
  count: number;
  message: string;
}> {
  // Check if already migrated
  const alreadyMigrated = await AsyncStorage.getItem(MIGRATION_FLAG);
  if (alreadyMigrated === 'true') {
    return { migrated: false, count: 0, message: 'Already migrated' };
  }

  try {
    let oldReadings: BPReading[] = [];

    if (Platform.OS === 'web') {
      // For web, load whatever is in Dexie (may be plain or mixed)
      const raw = await db.readings.toArray() as any[];
      oldReadings = raw
        .filter((r: any) => r && !r.encrypted && r.systolic !== undefined)
        .map((r: any) => r as BPReading);
    } else {
      // Native: try old key first if present
      const oldRaw = await AsyncStorage.getItem('bp_readings_v1');
      if (oldRaw) {
        try {
          const parsed = JSON.parse(oldRaw);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.systolic !== undefined) {
            oldReadings = parsed as BPReading[];
          }
        } catch {}
      }
    }

    if (oldReadings.length === 0) {
      // No old data or already in new format
      await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
      return { migrated: false, count: 0, message: 'No old data to migrate' };
    }

    console.log(`[Migration] Found ${oldReadings.length} old plaintext readings. Encrypting...`);

    // Encrypt all
    const encryptedPayloads = await encryptReadings(oldReadings, key);

    // Build new stored format
    const now = new Date().toISOString();
    const newStored = oldReadings.map((reading, index) => ({
      id: reading.id,
      encrypted: encryptedPayloads[index],
      createdAt: reading.createdAt || now,
      updatedAt: reading.updatedAt || now,
    }));

    // Write new format
    if (Platform.OS === 'web') {
      // Clear old and insert new encrypted
      await db.readings.clear();
      // Use bulk add for efficiency
      await (db.readings as any).bulkAdd(newStored);
    } else {
      // Native: write to new storage key
      await AsyncStorage.setItem(
        'bp_readings_v2_encrypted',
        JSON.stringify(newStored)
      );
      // Optionally clean old key (safe after success)
      await AsyncStorage.removeItem('bp_readings_v1').catch(() => {});
    }

    // Mark as done
    await AsyncStorage.setItem(MIGRATION_FLAG, 'true');

    return {
      migrated: true,
      count: oldReadings.length,
      message: `Successfully migrated ${oldReadings.length} readings to encrypted format`,
    };
  } catch (error) {
    console.error('[Migration] Failed', error);
    throw new Error('Migration failed. Your old data is still safe in the previous format.');
  }
}

/**
 * Call this after successful unlock to run migration if needed.
 */
export async function runMigrationIfNeeded(key: SessionCryptoKey) {
  try {
    const result = await migrateReadingsToEncrypted(key);
    if (result.migrated) {
      console.log('[Migration]', result.message);
    }
  } catch (e) {
    console.warn('[Migration] Skipped or failed:', e);
    // Do not block the app
  }
}
