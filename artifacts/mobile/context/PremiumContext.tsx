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
 * Free users keep: logging, last 14 days visible history, local insights, basic CSV export of visible data, meds, encryption.
 * Older logs stay encrypted on device and reappear when Pro is active. Toggling Pro never deletes readings.
 */
/** Free users can VIEW this many days. Stored logs are never pruned. */
export const FREE_HISTORY_DAYS = 14;

export function canViewHistoryRange(isPremium: boolean, days: number): boolean {
  if (isPremium) return true;
  if (days === 0) return false;
  return days <= FREE_HISTORY_DAYS;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** How many timestamps fall inside the free view window. Import still stores every row. */
export function countWithinFreeWindow(
  timestamps: string[],
  nowMs: number = Date.now()
): { visible: number; hidden: number } {
  const cutoff = nowMs - FREE_HISTORY_DAYS * MS_PER_DAY;
  let visible = 0;
  for (const ts of timestamps) {
    const t = new Date(ts).getTime();
    if (!Number.isNaN(t) && t >= cutoff) visible += 1;
  }
  return { visible, hidden: Math.max(0, timestamps.length - visible) };
}

/** Alert copy after CSV import. Older rows stay on device; they are not deleted. */
export function freeImportSummary(importedCount: number, visibleCount: number, noun = 'reading'): string {
  const hidden = Math.max(0, importedCount - visibleCount);
  const plural = importedCount === 1 ? noun : `${noun}s`;
  if (importedCount <= 0) return `No new ${plural} added.`;
  if (hidden <= 0) {
    return `Added ${importedCount} ${plural}.`;
  }
  return (
    `Added ${importedCount} ${plural}. ${visibleCount} ${visibleCount === 1 ? 'is' : 'are'} in your last ${FREE_HISTORY_DAYS} days. ` +
    `${hidden} older ${hidden === 1 ? `${noun} stays` : `${noun}s stay`} encrypted on this device and appear with Pro. Nothing was deleted.`
  );
}

export const PRO_FEATURES = {
  fullHistory: 'Full history (beyond 14 days)',
  csvImport: 'CSV import',
  encryptedBackup: 'Encrypted backup',
  encryptedRestore: 'Restore encrypted backup',
  pdfReport: 'PDF clinician report',
  reminders: 'Reminders',
  timeOfDayRich: 'Richer time-of-day patterns',
  medsCorrelation: 'Meds vs BP charts',
  homeWidget: 'Home Screen widget',
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
      'Quenly Pro',
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
        'Quenly Pro',
        `${label} is available with Pro.\n\nPro unlocks full history from your first log, import, encrypted backup/restore, PDF reports, and reminders.\n\nYour older logs stay on this device even if Pro is off. Local insights stay free.`,
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
