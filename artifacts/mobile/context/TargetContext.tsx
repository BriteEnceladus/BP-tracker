import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_TARGET,
  TARGET_STORAGE_KEY,
  parseStoredTarget,
  type PersonalTarget,
} from '../utils/targets';

interface TargetContextType {
  target: PersonalTarget;
  isReady: boolean;
  saveTarget: (next: PersonalTarget) => Promise<void>;
}

const TargetContext = createContext<TargetContextType | undefined>(undefined);

export function TargetProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<PersonalTarget>(DEFAULT_TARGET);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(TARGET_STORAGE_KEY)
      .then((raw) => {
        if (!cancelled) setTarget(parseStoredTarget(raw));
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveTarget = useCallback(async (next: PersonalTarget) => {
    setTarget(next);
    await AsyncStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const value = useMemo(
    () => ({ target, isReady, saveTarget }),
    [target, isReady, saveTarget]
  );

  return <TargetContext.Provider value={value}>{children}</TargetContext.Provider>;
}

export function useTarget() {
  const ctx = useContext(TargetContext);
  if (!ctx) throw new Error('useTarget must be used within TargetProvider');
  return ctx;
}
