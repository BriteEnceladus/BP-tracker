import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { BPReading } from '../src/db';
import * as store from '../src/readingsStore';
import { useCrypto } from './CryptoContext';
import { type SessionCryptoKey } from '../utils/readingEncryption';
import { BPReadingInput } from '../src/schemas';
import { runMigrationIfNeeded } from '../src/migration';

interface BPContextType {
  readings: BPReading[];
  isLoading: boolean;
  addReading: (reading: BPReadingInput) => Promise<void>;
  updateReading: (id: number, updates: Partial<BPReadingInput>) => Promise<void>;
  deleteReading: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const BPContext = createContext<BPContextType | undefined>(undefined);

export function BPProvider({ children }: { children: ReactNode }) {
  const [readings, setReadings] = useState<BPReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { cryptoKey, isUnlocked } = useCrypto();

  const getKey = useCallback(() => {
    if (!cryptoKey || !isUnlocked) {
      throw new Error('Cannot access encrypted data without valid session key');
    }
    return cryptoKey as SessionCryptoKey;
  }, [cryptoKey, isUnlocked]);

  const refresh = useCallback(async () => {
    if (!isUnlocked || !cryptoKey) {
      setReadings([]);
      setIsLoading(false);
      return;
    }
    try {
      const key = getKey();
      const data = await store.getAllReadings(key);
      setReadings(data);
    } catch (e) {
      console.error('[BPContext] refresh failed', e);
      setReadings([]);
    } finally {
      setIsLoading(false);
    }
  }, [getKey, isUnlocked, cryptoKey]);

  useEffect(() => {
    if (!isUnlocked || !cryptoKey) {
      // Wipe plaintext from React state + store memory cache on lock
      setReadings([]);
      setIsLoading(false);
      if (typeof (store as any).clearMemoryCache === 'function') {
        (store as any).clearMemoryCache();
      }
      return;
    }

    runMigrationIfNeeded(cryptoKey as SessionCryptoKey).catch(console.warn);

    if (Platform.OS === 'web' && 'subscribeToReadings' in store) {
      const key = cryptoKey as SessionCryptoKey;
      const unsub = (store as any).subscribeToReadings(
        (result: BPReading[]) => {
          setReadings(result);
          setIsLoading(false);
        },
        (err: any) => {
          console.error('Dexie liveQuery error:', err);
          setIsLoading(false);
        },
        key
      );
      return unsub;
    }

    refresh();
  }, [refresh, isUnlocked, cryptoKey]);

  const addReading = useCallback(
    async (readingData: BPReadingInput) => {
      const key = getKey();
      await store.addReading(readingData, key);
      if (Platform.OS !== 'web') await refresh();
    },
    [getKey, refresh]
  );

  const updateReading = useCallback(
    async (id: number, updates: Partial<BPReadingInput>) => {
      const key = getKey();
      await store.updateReading(id, updates, key);
      if (Platform.OS !== 'web') await refresh();
    },
    [getKey, refresh]
  );

  const deleteReading = useCallback(
    async (id: number) => {
      const key = getKey();
      await store.deleteReading(id, key);
      if (Platform.OS !== 'web') await refresh();
    },
    [getKey, refresh]
  );

  const value = useMemo(
    () => ({ readings, isLoading, addReading, updateReading, deleteReading, refresh }),
    [readings, isLoading, addReading, updateReading, deleteReading, refresh]
  );

  return <BPContext.Provider value={value}>{children}</BPContext.Provider>;
}

export function useBP() {
  const context = useContext(BPContext);
  if (context === undefined) {
    throw new Error('useBP must be used within a BPProvider');
  }
  return context;
}
