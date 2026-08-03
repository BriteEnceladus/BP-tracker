import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { BPReading } from '../src/db';
import * as store from '../src/readingsStore';

interface BPContextType {
  readings: BPReading[];
  isLoading: boolean;
  addReading: (reading: Omit<BPReading, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReading: (id: number, updates: Partial<BPReading>) => Promise<void>;
  deleteReading: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const BPContext = createContext<BPContextType | undefined>(undefined);

export function BPProvider({ children }: { children: ReactNode }) {
  const [readings, setReadings] = useState<BPReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await store.getAllReadings();
      setReadings(data);
    } catch (e) {
      console.error('[BPContext] refresh failed', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Web: prefer liveQuery for automatic reactivity
    if (Platform.OS === 'web' && 'subscribeToReadings' in store) {
      const unsub = (store as any).subscribeToReadings(
        (result: BPReading[]) => {
          setReadings(result);
          setIsLoading(false);
        },
        (err: any) => {
          console.error('Dexie liveQuery error:', err);
          setIsLoading(false);
        }
      );
      return unsub;
    }

    // Native: one-shot load + manual refresh after mutations
    refresh();
  }, [refresh]);

  const addReading = async (
    readingData: Omit<BPReading, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      await store.addReading(readingData);
      if (Platform.OS !== 'web') {
        await refresh();
      }
      // On web, liveQuery updates automatically
    } catch (error) {
      console.error('Failed to add reading:', error);
      throw error;
    }
  };

  const updateReading = async (id: number, updates: Partial<BPReading>) => {
    try {
      await store.updateReading(id, updates);
      if (Platform.OS !== 'web') {
        await refresh();
      }
    } catch (error) {
      console.error('Failed to update reading:', error);
      throw error;
    }
  };

  const deleteReading = async (id: number) => {
    try {
      await store.deleteReading(id);
      if (Platform.OS !== 'web') {
        await refresh();
      }
    } catch (error) {
      console.error('Failed to delete reading:', error);
      throw error;
    }
  };

  return (
    <BPContext.Provider
      value={{
        readings,
        isLoading,
        addReading,
        updateReading,
        deleteReading,
        refresh,
      }}
    >
      {children}
    </BPContext.Provider>
  );
}

export function useBP() {
  const context = useContext(BPContext);
  if (context === undefined) {
    throw new Error('useBP must be used within a BPProvider');
  }
  return context;
}
