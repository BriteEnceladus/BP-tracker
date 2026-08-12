import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { BPReading } from '../src/db';
import * as store from '../src/readingsStore';
import {
  isPuterAvailable,
  isSignedInToPuter,
  loadCloudReadings,
  saveCloudReadings,
  mergeReadings,
  signInToPuter,
  signOutOfPuter,
  getPuterUser,
  type PuterUserInfo,
} from '../utils/puterCloud';

interface BPContextType {
  readings: BPReading[];
  isLoading: boolean;
  /** Puter cloud */
  cloudAvailable: boolean;
  cloudSignedIn: boolean;
  cloudUser: PuterUserInfo | null;
  cloudSyncing: boolean;
  cloudLastSyncedAt: string | null;
  cloudError: string | null;
  signInCloud: () => Promise<void>;
  signOutCloud: () => Promise<void>;
  syncToCloud: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  addReading: (reading: Omit<BPReading, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReading: (id: number, updates: Partial<BPReading>) => Promise<void>;
  deleteReading: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const BPContext = createContext<BPContextType | undefined>(undefined);

export function BPProvider({ children }: { children: ReactNode }) {
  const [readings, setReadings] = useState<BPReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cloudSignedIn, setCloudSignedIn] = useState(false);
  const [cloudUser, setCloudUser] = useState<PuterUserInfo | null>(null);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudLastSyncedAt, setCloudLastSyncedAt] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const readingsRef = useRef<BPReading[]>([]);
  const autoSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cloudAvailable = isPuterAvailable();

  useEffect(() => {
    readingsRef.current = readings;
  }, [readings]);

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

  const pushCloud = useCallback(async (list: BPReading[]) => {
    if (!cloudAvailable) return;
    const signedIn = await isSignedInToPuter();
    if (!signedIn) return;

    setCloudSyncing(true);
    setCloudError(null);
    try {
      await saveCloudReadings(list);
      setCloudLastSyncedAt(new Date().toISOString());
    } catch (e: any) {
      console.error('[BPContext] cloud push failed', e);
      setCloudError(e?.message || 'Cloud sync failed');
    } finally {
      setCloudSyncing(false);
    }
  }, [cloudAvailable]);

  /** Debounced auto-push after local mutations when signed in. */
  const scheduleCloudPush = useCallback(() => {
    if (!cloudAvailable || !cloudSignedIn) return;
    if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
    autoSyncTimer.current = setTimeout(async () => {
      try {
        const list = await store.getAllReadings();
        await pushCloud(list);
      } catch (e) {
        console.warn('[BPContext] scheduled cloud push failed', e);
      }
    }, 400);
  }, [cloudAvailable, cloudSignedIn, pushCloud]);

  const refreshCloudStatus = useCallback(async () => {
    if (!cloudAvailable) {
      setCloudSignedIn(false);
      setCloudUser(null);
      return;
    }
    try {
      const signedIn = await isSignedInToPuter();
      setCloudSignedIn(signedIn);
      if (signedIn) {
        setCloudUser(await getPuterUser());
      } else {
        setCloudUser(null);
      }
    } catch (e) {
      console.warn('[BPContext] cloud status', e);
      setCloudSignedIn(false);
      setCloudUser(null);
    }
  }, [cloudAvailable]);

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

  useEffect(() => {
    refreshCloudStatus();
  }, [refreshCloudStatus]);

  const signInCloud = async () => {
    if (!cloudAvailable) {
      setCloudError('Cloud sync works in the web app (browser).');
      throw new Error('Cloud sync works in the web app (browser).');
    }
    setCloudSyncing(true);
    setCloudError(null);
    try {
      const user = await signInToPuter();
      setCloudSignedIn(true);
      setCloudUser(user);

      // Merge cloud + local, write both sides
      const local = await store.getAllReadings();
      const cloud = (await loadCloudReadings()) ?? [];
      const merged = mergeReadings(local, cloud);

      if ('replaceAllReadings' in store) {
        await (store as any).replaceAllReadings(merged);
      }
      await refresh();
      await saveCloudReadings(merged);
      setCloudLastSyncedAt(new Date().toISOString());
    } catch (e: any) {
      console.error('[BPContext] signInCloud', e);
      setCloudError(e?.message || 'Sign-in failed');
      throw e;
    } finally {
      setCloudSyncing(false);
    }
  };

  const signOutCloud = async () => {
    try {
      await signOutOfPuter();
    } catch (e) {
      console.warn(e);
    }
    setCloudSignedIn(false);
    setCloudUser(null);
    setCloudLastSyncedAt(null);
    setCloudError(null);
  };

  const syncToCloud = async () => {
    if (!cloudAvailable) throw new Error('Cloud sync is web-only.');
    if (!(await isSignedInToPuter())) {
      await signInCloud();
      return;
    }
    const list = await store.getAllReadings();
    await pushCloud(list);
  };

  const pullFromCloud = async () => {
    if (!cloudAvailable) throw new Error('Cloud sync is web-only.');
    setCloudSyncing(true);
    setCloudError(null);
    try {
      if (!(await isSignedInToPuter())) {
        await signInToPuter();
        setCloudSignedIn(true);
        setCloudUser(await getPuterUser());
      }
      const local = await store.getAllReadings();
      const cloud = (await loadCloudReadings()) ?? [];
      const merged = mergeReadings(local, cloud);
      if ('replaceAllReadings' in store) {
        await (store as any).replaceAllReadings(merged);
      }
      await refresh();
      await saveCloudReadings(merged);
      setCloudLastSyncedAt(new Date().toISOString());
    } catch (e: any) {
      setCloudError(e?.message || 'Pull failed');
      throw e;
    } finally {
      setCloudSyncing(false);
    }
  };

  const addReading = async (
    readingData: Omit<BPReading, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      await store.addReading(readingData);
      if (Platform.OS !== 'web') {
        await refresh();
      }
      // brief delay so liveQuery / store can settle before push
      setTimeout(() => scheduleCloudPush(), 50);
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
      setTimeout(() => scheduleCloudPush(), 50);
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
      setTimeout(() => scheduleCloudPush(), 50);
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
        cloudAvailable,
        cloudSignedIn,
        cloudUser,
        cloudSyncing,
        cloudLastSyncedAt,
        cloudError,
        signInCloud,
        signOutCloud,
        syncToCloud,
        pullFromCloud,
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
