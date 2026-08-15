import { describe, expect, it } from 'vitest';
import { createEncryptedBackup, decryptBackup, isEncryptedBackupFile } from '../backup';

async function deriveTestKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', enc.encode('backup-test-password'), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('backup-salt'), iterations: 1000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

describe('encrypted backup', () => {
  it('round-trips readings and medications', async () => {
    const key = await deriveTestKey();
    const original = {
      readings: [{ timestamp: '2026-08-14T12:00:00.000Z', systolic: 120, diastolic: 80 }],
      medications: [{ name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', active: true }],
    };
    const file = await createEncryptedBackup(key, original);
    expect(isEncryptedBackupFile(file)).toBe(true);
    expect(JSON.stringify(file)).not.toContain('Lisinopril');
    await expect(decryptBackup(key, file)).resolves.toEqual(original);
  });

  it('rejects a non-backup file', () => {
    expect(isEncryptedBackupFile({ foo: 'bar' })).toBe(false);
  });
});
