import { BPReading, Medication } from '../src/schemas';
import { decryptData, encryptData, type EncryptedData, type SessionCryptoKey } from './crypto';

export const BACKUP_FORMAT = 'bp-tracker-backup';
export const BACKUP_VERSION = 1;

export interface EncryptedBackupFile {
  format: typeof BACKUP_FORMAT;
  v: number;
  createdAt: string;
  encrypted: EncryptedData;
}

export interface BackupPlaintext {
  readings: BPReading[];
  medications: Medication[];
}

export function isEncryptedBackupFile(value: unknown): value is EncryptedBackupFile {
  if (!value || typeof value !== 'object') return false;
  const file = value as EncryptedBackupFile;
  return (
    file.format === BACKUP_FORMAT &&
    file.v === BACKUP_VERSION &&
    typeof file.createdAt === 'string' &&
    !!file.encrypted?.iv &&
    !!file.encrypted?.payload
  );
}

export async function createEncryptedBackup(
  key: SessionCryptoKey,
  data: BackupPlaintext
): Promise<EncryptedBackupFile> {
  const encrypted = await encryptData(key, JSON.stringify(data));
  return {
    format: BACKUP_FORMAT,
    v: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    encrypted,
  };
}

export async function decryptBackup(
  key: SessionCryptoKey,
  file: EncryptedBackupFile
): Promise<BackupPlaintext> {
  if (!isEncryptedBackupFile(file)) {
    throw new Error('This file is not a BP Tracker encrypted backup');
  }
  const plaintext = await decryptData(key, file.encrypted);
  const parsed = JSON.parse(plaintext) as BackupPlaintext;
  if (!Array.isArray(parsed.readings) || !Array.isArray(parsed.medications)) {
    throw new Error('Backup contents are not valid');
  }
  return parsed;
}
