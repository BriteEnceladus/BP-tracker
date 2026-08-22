import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as store from '../src/glucoseStore';
import { useCrypto } from './CryptoContext';
import type { SessionCryptoKey } from '../utils/glucoseEncryption';
import type { GlucoseReading, GlucoseReadingInput } from '../src/schemas';

interface GlucoseContextType {
  glucose: GlucoseReading[];
  isLoading: boolean;
  addGlucose: (reading: GlucoseReadingInput) => Promise<void>;
  updateGlucose: (id: number, updates: Partial<GlucoseReadingInput>) => Promise<void>;
  deleteGlucose: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const GlucoseContext = createContext<GlucoseContextType | undefined>(undefined);

export function GlucoseProvider({ children }: { children: ReactNode }) {
  const [glucose, setGlucose] = useState<GlucoseReading[]>([]);
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
      setGlucose([]);
      setIsLoading(false);
      return;
    }
    try {
      const data = await store.getAllGlucose(getKey());
      setGlucose(data);
    } catch (e) {
      console.error('[GlucoseContext] refresh failed', e);
      setGlucose([]);
    } finally {
      setIsLoading(false);
    }
  }, [getKey, isUnlocked, cryptoKey]);

  useEffect(() => {
    if (!isUnlocked || !cryptoKey) {
      setGlucose([]);
      setIsLoading(false);
      if (typeof store.clearMemoryCache === 'function') {
        store.clearMemoryCache();
      }
      return;
    }

    if (Platform.OS === 'web' && 'subscribeToGlucose' in store) {
      const unsub = (store as { subscribeToGlucose: typeof store.subscribeToGlucose }).subscribeToGlucose(
        (result) => {
          setGlucose(result);
          setIsLoading(false);
        },
        (err) => {
          console.error('Glucose liveQuery error:', err);
          setIsLoading(false);
        },
        cryptoKey as SessionCryptoKey
      );
      return unsub;
    }

    refresh();
  }, [refresh, isUnlocked, cryptoKey]);

  const addGlucose = useCallback(
    async (readingData: GlucoseReadingInput) => {
      await store.addGlucose(readingData, getKey());
      if (Platform.OS !== 'web') await refresh();
    },
    [getKey, refresh]
  );

  const updateGlucose = useCallback(
    async (id: number, updates: Partial<GlucoseReadingInput>) => {
      await store.updateGlucose(id, updates, getKey());
      if (Platform.OS !== 'web') await refresh();
    },
    [getKey, refresh]
  );

  const deleteGlucose = useCallback(
    async (id: number) => {
      await store.deleteGlucose(id, getKey());
      if (Platform.OS !== 'web') await refresh();
    },
    [getKey, refresh]
  );

  const value = useMemo(
    () => ({ glucose, isLoading, addGlucose, updateGlucose, deleteGlucose, refresh }),
    [glucose, isLoading, addGlucose, updateGlucose, deleteGlucose, refresh]
  );

  return <GlucoseContext.Provider value={value}>{children}</GlucoseContext.Provider>;
}

export function useGlucose() {
  const context = useContext(GlucoseContext);
  if (context === undefined) {
    throw new Error('useGlucose must be used within a GlucoseProvider');
  }
  return context;
}
