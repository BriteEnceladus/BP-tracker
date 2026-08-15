import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ENABLED_KEY = 'bp_ai_insights_opt_in';
const API_KEY_STORE = 'bp_xai_api_key';

interface AiSettingsContextType {
  insightsEnabled: boolean;
  hasApiKey: boolean;
  isReady: boolean;
  setInsightsEnabled: (enabled: boolean) => Promise<void>;
  saveApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  getApiKey: () => Promise<string | null>;
}

const AiSettingsContext = createContext<AiSettingsContextType | undefined>(undefined);

async function readSecret(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function writeSecret(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (value) await AsyncStorage.setItem(key, value);
    else await AsyncStorage.removeItem(key);
    return;
  }
  if (value) await SecureStore.setItemAsync(key, value);
  else await SecureStore.deleteItemAsync(key);
}

export function AiSettingsProvider({ children }: { children: ReactNode }) {
  const [insightsEnabled, setEnabledState] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(ENABLED_KEY), readSecret(API_KEY_STORE)])
      .then(([enabled, key]) => {
        setEnabledState(enabled === '1');
        setHasApiKey(!!key);
      })
      .finally(() => setIsReady(true));
  }, []);

  const setInsightsEnabled = useCallback(async (enabled: boolean) => {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
    setEnabledState(enabled);
  }, []);

  const saveApiKey = useCallback(async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) {
      await writeSecret(API_KEY_STORE, null);
      setHasApiKey(false);
      return;
    }
    await writeSecret(API_KEY_STORE, trimmed);
    setHasApiKey(true);
  }, []);

  const clearApiKey = useCallback(async () => {
    await writeSecret(API_KEY_STORE, null);
    setHasApiKey(false);
  }, []);

  const getApiKey = useCallback(async () => readSecret(API_KEY_STORE), []);

  return (
    <AiSettingsContext.Provider
      value={{
        insightsEnabled,
        hasApiKey,
        isReady,
        setInsightsEnabled,
        saveApiKey,
        clearApiKey,
        getApiKey,
      }}
    >
      {children}
    </AiSettingsContext.Provider>
  );
}

export function useAiSettings() {
  const ctx = useContext(AiSettingsContext);
  if (!ctx) throw new Error('useAiSettings must be used within AiSettingsProvider');
  return ctx;
}
