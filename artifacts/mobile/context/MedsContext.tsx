import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { liveQuery } from 'dexie';
import { db, Medication } from '../src/db';

interface MedsContextType {
  medications: Medication[];
  isLoading: boolean;
  addMedication: (med: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMedication: (id: number, updates: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: number) => Promise<void>;
  toggleActive: (id: number) => Promise<void>;
}

const MedsContext = createContext<MedsContextType | undefined>(undefined);

export function MedsProvider({ children }: { children: ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.medications.orderBy('name').toArray()
    ).subscribe({
      next: (result) => {
        setMedications(result);
        setIsLoading(false);
      },
      error: (err) => {
        console.error('Dexie liveQuery error (medications):', err);
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, []);

  const addMedication = async (
    medData: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const now = new Date().toISOString();
    const newMed: Medication = {
      ...medData,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.medications.add(newMed);
    } catch (error) {
      console.error('Failed to add medication:', error);
      throw error;
    }
  };

  const updateMedication = async (id: number, updates: Partial<Medication>) => {
    try {
      const existing = await db.medications.get(id);
      if (!existing) throw new Error('Medication not found');

      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await db.medications.put(updated);
    } catch (error) {
      console.error('Failed to update medication:', error);
      throw error;
    }
  };

  const deleteMedication = async (id: number) => {
    try {
      await db.medications.delete(id);
    } catch (error) {
      console.error('Failed to delete medication:', error);
      throw error;
    }
  };

  const toggleActive = async (id: number) => {
    try {
      const existing = await db.medications.get(id);
      if (!existing) throw new Error('Medication not found');
      await updateMedication(id, { isActive: !existing.isActive });
    } catch (error) {
      console.error('Failed to toggle medication status:', error);
      throw error;
    }
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
      }}
    >
      {children}
    </MedsContext.Provider>
  );
}

export function useMeds() {
  const context = useContext(MedsContext);
  if (context === undefined) {
    throw new Error('useMeds must be used within a MedsProvider');
  }
  return context;
}
