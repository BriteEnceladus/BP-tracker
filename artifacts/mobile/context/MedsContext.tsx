import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Medication, MedicationInput } from '../src/schemas';
import * as store from '../src/medsStore';

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

  const refresh = useCallback(async () => {
    try {
      const data = await store.getAllMedications();
      setMedications(data);
    } catch (e) {
      console.error('[MedsContext] refresh failed', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMedication = async (data: MedicationInput) => {
    await store.addMedication(data);
    await refresh();
  };

  const updateMedication = async (id: number, updates: Partial<MedicationInput>) => {
    await store.updateMedication(id, updates);
    await refresh();
  };

  const deleteMedication = async (id: number) => {
    await store.deleteMedication(id);
    await refresh();
  };

  const toggleActive = async (id: number) => {
    const med = medications.find((m) => m.id === id);
    if (!med) return;
    await store.updateMedication(id, { active: !med.active });
    await refresh();
  };

  return (
    <MedsContext.Provider
      value={{
        medications,
        isLoading,
        addMedication,
        updateMedication,
        deleteMedication,
        toggleActive,
        refresh,
      }}
    >
      {children}
    </MedsContext.Provider>
  );
}

export function useMeds() {
  const ctx = useContext(MedsContext);
  if (!ctx) throw new Error('useMeds must be used within MedsProvider');
  return ctx;
}
