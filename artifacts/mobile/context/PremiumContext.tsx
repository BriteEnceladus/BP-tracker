import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_KEY = 'bp_premium_status';

/**
 * Pro feature flags — single source of truth for gating.
 * Free users keep: logging, last 30 days history, local insights, basic CSV export of visible data, meds, encryption.
 */
export const PRO_FEATURES = {
  fullHistory: 'Full history (beyond 30 days)',
  csvImport: 'CSV import',
  encryptedBackup: 'Encrypted backup',
  encryptedRestore: 'Restore encrypted backup',
  pdfReport: 'PDF clinician report',
  reminders: 'Reminders',
  /** Optional future: backend-powered Grok without user API key */
  backendInsights: 'Pro insights',
} as const;

export type ProFeatureKey = keyof typeof PRO_FEATURES;

export interface EntitlementState {
  isPremium: boolean;
  lastCheckedAt: string | null;
  productId: string | null;
}

interface PremiumContextType {
  isPremium: boolean;
  isReady: boolean;
  entitlement: EntitlementState;
  setMockPremium: (value: boolean) => Promise<void>;
  refreshEntitlement: () => Promise<boolean>;
  purchase: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  requirePro: (feature: ProFeatureKey | string) => void;
  applyEntitlement: (active: boolean, productId?: string | null) => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

async function readLocalPremium(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(PREMIUM_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

async function writeLocalPremium(active: boolean): Promise<void> {
  await AsyncStorage.setItem(PREMIUM_KEY, active ? '1' : '0');
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);

  const refreshEntitlement = useCallback(async (): Promise<boolean> => {
    // HOOK: Backend / IAP — replace with store or GET /entitlement then applyEntitlement
    const active = await readLocalPremium();
    setIsPremium(active);
    setLastCheckedAt(new Date().toISOString());
    return active;
  }, []);

  useEffect(() => {
    refreshEntitlement().finally(() => setIsReady(true));
  }, [refreshEntitlement]);

  const applyEntitlement = useCallback(async (active: boolean, nextProductId?: string | null) => {
    await writeLocalPremium(active);
    setIsPremium(active);
    setProductId(nextProductId ?? null);
    setLastCheckedAt(new Date().toISOString());
  }, []);

  const setMockPremium = useCallback(
    async (value: boolean) => {
      await applyEntitlement(value, value ? 'mock_pro' : null);
    },
    [applyEntitlement]
  );

  const purchase = useCallback(async () => {
    // HOOK: Start subscription — e.g. Purchases.purchasePackage then applyEntitlement(true, id)
    Alert.alert(
      'BP Tracker Pro',
      'Subscription checkout is not connected yet.\n\nUse the Mock Pro toggle in Settings while developing. When your backend or store IAP is ready, wire it into PremiumContext.purchase().',
      [{ text: 'OK' }]
    );
  }, []);

  const restorePurchases = useCallback(async () => {
    // HOOK: Restore — e.g. Purchases.restorePurchases then applyEntitlement
    Alert.alert(
      'Restore purchases',
      'Restore is not connected yet. After IAP/backend is hooked up, this will re-activate Pro on a reinstall.',
      [{ text: 'OK' }]
    );
  }, []);

  const requirePro = useCallback(
    (feature: ProFeatureKey | string) => {
      const label =
        typeof feature === 'string' && feature in PRO_FEATURES
          ? PRO_FEATURES[feature as ProFeatureKey]
          : String(feature);

      Alert.alert(
        'BP Tracker Pro',
        `${label} is available with Pro.\n\nPro unlocks full history, import, encrypted backup/restore, PDF reports, and reminders.\n\nLocal insights stay free on this device.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'See Pro', onPress: () => purchase() },
        ]
      );
    },
    [purchase]
  );

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        isReady,
        entitlement: { isPremium, lastCheckedAt, productId },
        setMockPremium,
        refreshEntitlement,
        purchase,
        restorePurchases,
        requirePro,
        applyEntitlement,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}
