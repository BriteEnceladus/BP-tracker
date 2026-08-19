import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_KEY = 'bp_premium_status';

interface PremiumContextType {
  /** True when the user has an active Pro entitlement (mock for now). */
  isPremium: boolean;
  isReady: boolean;
  /**
   * Mock toggle only — used during development / UI polish.
   * Real IAP subscription flow will replace this.
   */
  setMockPremium: (value: boolean) => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREMIUM_KEY)
      .then((value) => setIsPremium(value === '1'))
      .catch(() => setIsPremium(false))
      .finally(() => setIsReady(true));
  }, []);

  const setMockPremium = useCallback(async (value: boolean) => {
    await AsyncStorage.setItem(PREMIUM_KEY, value ? '1' : '0');
    setIsPremium(value);
  }, []);

  return (
    <PremiumContext.Provider value={{ isPremium, isReady, setMockPremium }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}
