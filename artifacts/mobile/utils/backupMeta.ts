import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_BACKUP_KEY = 'bp_last_backup_at';
const BACKUP_REMINDER_DISMISSED_KEY = 'bp_backup_reminder_dismissed_at';

/** Recommended interval in days */
export const BACKUP_INTERVAL_DAYS = 7;

export async function getLastBackupAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export async function setLastBackupAt(isoDate: string = new Date().toISOString()): Promise<void> {
  await AsyncStorage.setItem(LAST_BACKUP_KEY, isoDate);
}

export async function clearLastBackupAt(): Promise<void> {
  await AsyncStorage.removeItem(LAST_BACKUP_KEY);
}

/**
 * Returns true if no backup has been recorded, or the last one is older than `days`.
 */
export async function isBackupDue(days: number = BACKUP_INTERVAL_DAYS): Promise<boolean> {
  const last = await getLastBackupAt();
  if (!last) return true;
  const lastMs = new Date(last).getTime();
  if (Number.isNaN(lastMs)) return true;
  const ageDays = (Date.now() - lastMs) / (1000 * 60 * 60 * 24);
  return ageDays >= days;
}

/** Human-readable relative label for Settings UI */
export function formatLastBackupLabel(iso: string | null): string {
  if (!iso) return 'Never';
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return 'Never';
  const ageDays = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
  if (ageDays <= 0) return 'Today';
  if (ageDays === 1) return 'Yesterday';
  if (ageDays < 7) return `${ageDays} days ago`;
  if (ageDays < 30) return `${Math.floor(ageDays / 7)} week${ageDays >= 14 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString();
}

/** Prevent showing the soft reminder more than once per day */
export async function shouldShowBackupReminder(): Promise<boolean> {
  const due = await isBackupDue();
  if (!due) return false;
  try {
    const dismissed = await AsyncStorage.getItem(BACKUP_REMINDER_DISMISSED_KEY);
    if (!dismissed) return true;
    const dismissedMs = new Date(dismissed).getTime();
    const hoursSince = (Date.now() - dismissedMs) / (1000 * 60 * 60);
    return hoursSince >= 20; // allow again next day
  } catch {
    return true;
  }
}

export async function dismissBackupReminder(): Promise<void> {
  await AsyncStorage.setItem(BACKUP_REMINDER_DISMISSED_KEY, new Date().toISOString());
}
