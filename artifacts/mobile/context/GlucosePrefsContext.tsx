import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { GlucoseDisplayUnit } from '../src/schemas';
import {
  getGlucoseDisplayUnit,
  getGlucoseTabVisible,
  setGlucoseDisplayUnit,
  setGlucoseTabVisible as persistTabVisible,
} from '../utils/glucoseUnit';

interface GlucosePrefsType {
  unit: GlucoseDisplayUnit;
  tabVisible: boolean;
  isReady: boolean;
  setUnit: (unit: GlucoseDisplayUnit) => Promise<void>;
  setTabVisible: (visible: boolean) => Promise<void>;
}

const GlucosePrefsContext = createContext<GlucosePrefsType | undefined>(undefined);

export function GlucosePrefsProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<GlucoseDisplayUnit>('mg/dL');
  const [tabVisible, setTabVisibleState] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getGlucoseDisplayUnit(), getGlucoseTabVisible()])
      .then(([nextUnit, nextVisible]) => {
        if (cancelled) return;
        setUnitState(nextUnit);
        setTabVisibleState(nextVisible);
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setUnit = useCallback(async (next: GlucoseDisplayUnit) => {
    setUnitState(next);
    await setGlucoseDisplayUnit(next);
  }, []);

  const setTabVisible = useCallback(async (visible: boolean) => {
    setTabVisibleState(visible);
    await persistTabVisible(visible);
  }, []);

  const value = useMemo(
    () => ({ unit, tabVisible, isReady, setUnit, setTabVisible }),
    [unit, tabVisible, isReady, setUnit, setTabVisible]
  );

  return <GlucosePrefsContext.Provider value={value}>{children}</GlucosePrefsContext.Provider>;
}

export function useGlucosePrefs() {
  const ctx = useContext(GlucosePrefsContext);
  if (!ctx) throw new Error('useGlucosePrefs must be used within GlucosePrefsProvider');
  return ctx;
}
