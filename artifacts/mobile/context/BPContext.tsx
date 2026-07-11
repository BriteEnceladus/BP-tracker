import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, BPReading } from '../src/db';

interface BPContextType {
  readings: BPReading[];
  isLoading: boolean;
  addReading: (reading: Omit<BPReading, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReading: (id: number, updates: Partial<BPReading>) => Promise<void>;
  deleteReading: (id: number) => Promise<void>;
  refreshReadings: () => Promise<void>;
}

const BPContext = createContext<BPContextType | undefined>(undefined);

export function BPProvider({ children }: { children: ReactNode }) {
  const [readings, setReadings] = useState<BPReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load readings from Dexie on mount
  const loadReadings = async () => {
    try {
      const allReadings = await db.readings.orderBy('timestamp').reverse().toArray();
      setReadings(allReadings);
    } catch (error) {
      console.error('Failed to load readings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReadings();
  }, []);

  const addReading = async (readingData: Omit<BPReading, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newReading: BPReading = {
      ...readingData,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.readings.add(newReading);
      await loadReadings(); // Refresh state
    } catch (error) {
      console.error('Failed to add reading:', error);
      throw error;
    }
  };

  const updateReading = async (id: number, updates: Partial<BPReading>) => {
    try {
      const existing = await db.readings.get(id);
      if (!existing) throw new Error('Reading not found');

      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await db.readings.put(updated);
      await loadReadings();
    } catch (error) {
      console.error('Failed to update reading:', error);
      throw error;
    }
  };

  const deleteReading = async (id: number) => {
    try {
      await db.readings.delete(id);
      await loadReadings();
    } catch (error) {
      console.error('Failed to delete reading:', error);
      throw error;
    }
  };

  const refreshReadings = async () => {
    await loadReadings();
  };

  return (
    <BPContext.Provider
      value={{
        readings,
        isLoading,
        addReading,
        updateReading,
        deleteReading,
        refreshReadings,
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
