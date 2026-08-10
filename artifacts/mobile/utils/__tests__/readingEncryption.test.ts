import { describe, it, expect, beforeAll } from 'vitest';
import {
  encryptReading,
  decryptReading,
  encryptReadings,
  decryptReadings,
} from '../readingEncryption';
import type { BPReading, BPReadingInput } from '../../src/schemas';

// ---------- helpers ----------

async function deriveTestKey(salt: string = 'test-salt-12345678'): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode('test-master-password-for-unit-tests'),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 1000, // low for tests
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ---------- sample data ----------

const sampleReading: BPReading = {
  id: 'test-id-001',
  systolic: 120,
  diastolic: 80,
  pulse: 72,
  notes: 'Feeling fine',
  timestamp: new Date('2026-08-09T12:00:00Z').toISOString(),
  createdAt: new Date('2026-08-09T12:00:00Z').toISOString(),
  updatedAt: new Date('2026-08-09T12:00:00Z').toISOString(),
};

const sampleInput: BPReadingInput = {
  systolic: 118,
  diastolic: 76,
  pulse: 68,
  notes: 'After walk',
  timestamp: new Date('2026-08-09T14:30:00Z').toISOString(),
};

// ---------- tests ----------

describe('readingEncryption', () => {
  let testKey: CryptoKey;

  beforeAll(async () => {
    testKey = await deriveTestKey();
  });

  it('successfully round-trips a full BPReading', async () => {
    const encrypted = await encryptReading(sampleReading, testKey);
    const decrypted = await decryptReading(encrypted, testKey);

    expect(decrypted).toEqual(sampleReading);
  });

  it('successfully round-trips a BPReadingInput', async () => {
    const encrypted = await encryptReading(sampleInput as any, testKey);
    const decrypted = await decryptReading(encrypted, testKey);

    expect(decrypted.systolic).toBe(sampleInput.systolic);
    expect(decrypted.diastolic).toBe(sampleInput.diastolic);
    expect(decrypted.pulse).toBe(sampleInput.pulse);
    expect(decrypted.notes).toBe(sampleInput.notes);
  });

  it('throws when authentication tag is tampered with', async () => {
    const encrypted = await encryptReading(sampleReading, testKey);

    // Tamper with the ciphertext / tag
    const tampered = {
      ...encrypted,
      ciphertext: encrypted.ciphertext.slice(0, -4) + 'XXXX',
    };

    await expect(decryptReading(tampered as any, testKey)).rejects.toThrow();
  });

  it('throws when using a different (wrong) key', async () => {
    const encrypted = await encryptReading(sampleReading, testKey);

    // Different salt → different key
    const wrongKey = await deriveTestKey('different-wrong-salt-987654321');

    await expect(decryptReading(encrypted, wrongKey)).rejects.toThrow();
  });

  it('rejects invalid / malformed encrypted payloads', async () => {
    await expect(decryptReading(null as any, testKey)).rejects.toThrow();
    await expect(decryptReading({} as any, testKey)).rejects.toThrow();
    await expect(decryptReading({ iv: 'abc' } as any, testKey)).rejects.toThrow();
  });

  it('produces different IVs for different encryptions (IV uniqueness)', async () => {
    const encrypted1 = await encryptReading(sampleReading, testKey);
    const encrypted2 = await encryptReading(sampleReading, testKey);

    expect(encrypted1.iv).not.toBe(encrypted2.iv);
  });

  it('bulk encrypt/decrypt round-trips correctly', async () => {
    const readings = [sampleReading, { ...sampleReading, id: 'test-id-002', systolic: 130 }];

    const encryptedList = await encryptReadings(readings, testKey);
    const decryptedList = await decryptReadings(encryptedList, testKey);

    expect(decryptedList).toHaveLength(2);
    expect(decryptedList[0]).toEqual(readings[0]);
    expect(decryptedList[1].systolic).toBe(130);
  });
});