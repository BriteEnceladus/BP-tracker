import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { liveQuery } from 'dexie';
import { db, BPReading } from '../src/db';

interface BPContextType {
  readings: BPReading[];
  isLoading: boolean;
  addReading: (reading: Omit<BPReading, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReading: (id: number, updates: Partial<BPReading>) => Promise<void>;
  deleteReading: (id: number) => Promise<void>;
}

const BPContext = createContext<BPContextType | undefined>(undefined);

export function BPProvider({ children }: { children: ReactNode }) {
  const [readings, setReadings] = useState<BPReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use Dexie's liveQuery for automatic reactive updates
  useEffect(() => {
    const subscription = liveQuery(() =>
      db.readings.orderBy('timestamp').reverse().toArray()
    ).subscribe({
      next: (result) => {
        setReadings(result);
        setIsLoading(false);
      },
      error: (err) => {
        console.error('Dexie liveQuery error:', err);
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
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
      // No manual refresh needed - liveQuery handles reactivity automatically
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
      // liveQuery automatically updates all subscribed components
    } catch (error) {
      console.error('Failed to update reading:', error);
      throw error;
    }
  };

  const deleteReading = async (id: number) => {
    try {
      await db.readings.delete(id);
      // liveQuery handles UI updates automatically
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
