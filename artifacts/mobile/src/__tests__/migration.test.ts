import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrateReadingsToEncrypted, runMigrationIfNeeded } from '../migration';
import type { SessionCryptoKey } from '../../utils/readingEncryption';
import type { BPReading } from '../schemas';

// --- Mocks ---

// Mock react-native Platform — must be hoisted
vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

const { mockAsyncStorage, mockDb, mockEncryptReadings } = vi.hoisted(() => ({
  mockAsyncStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  mockDb: {
    readings: {
      toArray: vi.fn(),
      clear: vi.fn(),
      bulkAdd: vi.fn(),
    },
  },
  mockEncryptReadings: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
}));

vi.mock('../db', () => ({
  db: mockDb,
}));

vi.mock('../../utils/readingEncryption', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    encryptReadings: mockEncryptReadings,
  };
});

// Helper to create a fake key (typed as the real one for tests)
function createFakeKey(): SessionCryptoKey {
  return {} as SessionCryptoKey;
}

const fakeKey = createFakeKey();

const legacyReading1: BPReading = {
  id: 1,
  timestamp: '2026-01-01T10:00:00Z',
  systolic: 120,
  diastolic: 80,
  heartRate: 70,
};

const legacyReading2: BPReading = {
  id: 2,
  timestamp: '2026-01-02T11:00:00Z',
  systolic: 130,
  diastolic: 85,
};

describe('migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAsyncStorage.getItem.mockReset();
    mockAsyncStorage.setItem.mockReset();
    mockDb.readings.toArray.mockReset();
    mockDb.readings.clear.mockReset();
    mockDb.readings.bulkAdd.mockReset();
    mockEncryptReadings.mockReset();
  });

  it('returns early if already migrated (idempotent)', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('true');

    const result = await migrateReadingsToEncrypted(fakeKey);

    expect(result.migrated).toBe(false);
    expect(result.count).toBe(0);
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('detects legacy plaintext on web and migrates it', async () => {
    mockAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === 'bp_readings_migrated_to_v2_encrypted') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    mockDb.readings.toArray.mockResolvedValue([legacyReading1, { encrypted: 'something' }]);

    const encryptedPayload = { iv: 'iv1', payload: 'payload1' };
    mockEncryptReadings.mockResolvedValue([encryptedPayload]);

    const result = await migrateReadingsToEncrypted(fakeKey);

    expect(result.migrated).toBe(true);
    expect(result.count).toBe(1);
    expect(mockEncryptReadings).toHaveBeenCalledWith([legacyReading1], fakeKey);
    expect(mockDb.readings.clear).toHaveBeenCalled();
    expect(mockDb.readings.bulkAdd).toHaveBeenCalled();
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('bp_readings_migrated_to_v2_encrypted', 'true');
  });

  it('is idempotent after successful migration', async () => {
    // First run
    mockAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key.includes('migrated')) return Promise.resolve(null);
      return Promise.resolve(null);
    });
    mockDb.readings.toArray.mockResolvedValue([legacyReading1]);
    mockEncryptReadings.mockResolvedValue([{ iv: 'x', payload: 'y' }]);

    const first = await migrateReadingsToEncrypted(fakeKey);
    expect(first.migrated).toBe(true);

    // Second run - flag is now set
    mockAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key.includes('migrated')) return Promise.resolve('true');
      return Promise.resolve(null);
    });

    const second = await migrateReadingsToEncrypted(fakeKey);
    expect(second.migrated).toBe(false);
  });

  it('handles mixed (legacy + already encrypted) datasets', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockDb.readings.toArray.mockResolvedValue([
      legacyReading1,
      { id: 99, encrypted: { iv: 'old', payload: 'old' } },
      legacyReading2,
    ]);

    mockEncryptReadings.mockResolvedValue([
      { iv: 'a', payload: 'b' },
      { iv: 'c', payload: 'd' },
    ]);

    const result = await migrateReadingsToEncrypted(fakeKey);

    expect(result.migrated).toBe(true);
    expect(result.count).toBe(2); // only the two legacy ones
    expect(mockEncryptReadings).toHaveBeenCalledWith([legacyReading1, legacyReading2], fakeKey);
  });

  it('does not destroy data on failure (throws with original data safe)', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockDb.readings.toArray.mockResolvedValue([legacyReading1]);
    mockEncryptReadings.mockRejectedValue(new Error('Encryption exploded'));

    await expect(migrateReadingsToEncrypted(fakeKey)).rejects.toThrow(
      'Migration failed. Your old data is still safe in the previous format.'
    );

    // Should not have cleared or written
    expect(mockDb.readings.clear).not.toHaveBeenCalled();
    expect(mockDb.readings.bulkAdd).not.toHaveBeenCalled();
  });

  it('runMigrationIfNeeded does not throw on migration failure', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockDb.readings.toArray.mockResolvedValue([legacyReading1]);
    mockEncryptReadings.mockRejectedValue(new Error('boom'));

    // Should swallow the error
    await expect(runMigrationIfNeeded(fakeKey)).resolves.toBeUndefined();
  });

  it('no-op when no legacy data exists', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockDb.readings.toArray.mockResolvedValue([{ encrypted: 'already-good' }]);

    const result = await migrateReadingsToEncrypted(fakeKey);

    expect(result.migrated).toBe(false);
    expect(result.message).toMatch(/No old data/);
  });
});
