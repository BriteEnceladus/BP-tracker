import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { Medication, MedicationInput } from '../src/schemas';
import * as store from '../src/medsStore';
import { useCrypto } from './CryptoContext';
import type { SessionCryptoKey } from '../utils/crypto';

interface MedsContextType {
  medications: Medication[];
  isLoading: boolean;
  addMedication: (data: MedicationInput) => Promise<void>;
  updateMedication: (id: number, updates: Partial<MedicationInput>) => Promise<void>;
  deleteMedication: (id: number) => Promise<void>;
  toggleActive: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const MedsContext = createContext<MedsContextType | undefined>(undefined);

export function MedsProvider({ children }: { children: ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { cryptoKey, isUnlocked } = useCrypto();

  const getKey = useCallback((): SessionCryptoKey => {
    if (!cryptoKey || !isUnlocked) {
      throw new Error('Cannot access encrypted medications without session key');
    }
    return cryptoKey as SessionCryptoKey;
  }, [cryptoKey, isUnlocked]);

  const refresh = useCallback(async () => {
    if (!isUnlocked || !cryptoKey) {
      setMedications([]);
      setIsLoading(false);
      return;
    }
    try {
      const data = await store.getAllMedications(getKey());
      setMedications(data);
    } catch (e) {
      console.error('[MedsContext] refresh failed', e);
      setMedications([]);
    } finally {
      setIsLoading(false);
    }
  }, [getKey, isUnlocked, cryptoKey]);

  // Load when unlocked; wipe plaintext state when locked
  useEffect(() => {
    if (!isUnlocked || !cryptoKey) {
      setMedications([]);
      setIsLoading(false);
      if (typeof store.clearMemoryCache === 'function') {
        store.clearMemoryCache();
      }
      return;
    }
    refresh();
  }, [isUnlocked, cryptoKey, refresh]);

  const addMedication = useCallback(
    async (data: MedicationInput) => {
      await store.addMedication(data, getKey());
      await refresh();
    },
    [getKey, refresh]
  );

  const updateMedication = useCallback(
    async (id: number, updates: Partial<MedicationInput>) => {
      await store.updateMedication(id, updates, getKey());
      await refresh();
    },
    [getKey, refresh]
  );

  const deleteMedication = useCallback(
    async (id: number) => {
      await store.deleteMedication(id, getKey());
      await refresh();
    },
    [getKey, refresh]
  );

  const toggleActive = useCallback(
    async (id: number) => {
      const med = medications.find((m) => m.id === id);
      if (!med) return;
      await store.updateMedication(id, { active: !med.active }, getKey());
      await refresh();
    },
    [medications, getKey, refresh]
  );

  const value = useMemo(
    () => ({
      medications,
      isLoading,
      addMedication,
      updateMedication,
      deleteMedication,
      toggleActive,
      refresh,
    }),
    [medications, isLoading, addMedication, updateMedication, deleteMedication, toggleActive, refresh]
  );

  return <MedsContext.Provider value={value}>{children}</MedsContext.Provider>;
}

export function useMeds() {
  const ctx = useContext(MedsContext);
  if (!ctx) throw new Error('useMeds must be used within MedsProvider');
  return ctx;
}
