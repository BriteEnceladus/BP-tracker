import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

interface EnvContextType {
  appName: string;
  version: string;
  grokApiBase: string;
  grokApiKey: string | null;
  setGrokApiKey: (key: string | null) => Promise<void>;
  hasGrokKey: boolean;
  isAiEnabled: boolean;
}

const EnvContext = createContext<EnvContextType | undefined>(undefined);

export const EnvProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [grokApiKey, setGrokApiKeyState] = useState<string | null>(null);

  const extra = Constants.expoConfig?.extra || {};
  const appName = extra.appName || 'Quenly';
  const version = extra.version || '1.0.0';
  const grokApiBase = extra.grokApiBase || 'https://api.x.ai/v1';

  useEffect(() => {
    const loadKey = async () => {
      try {
        const storedKey = await SecureStore.getItemAsync('grok_api_key');
        if (storedKey) {
          setGrokApiKeyState(storedKey);
        }
      } catch (error) {
        console.warn('Failed to load Grok API key');
      }
    };
    loadKey();
  }, []);

  const setGrokApiKey = async (key: string | null) => {
    try {
      if (key) {
        await SecureStore.setItemAsync('grok_api_key', key);
      } else {
        await SecureStore.deleteItemAsync('grok_api_key');
      }
      setGrokApiKeyState(key);
    } catch (error) {
      console.error('Failed to save Grok API key securely');
      throw error;
    }
  };

  const hasGrokKey = !!grokApiKey;
  const isAiEnabled = hasGrokKey;

  return (
    <EnvContext.Provider value={{
      appName,
      version,
      grokApiBase,
      grokApiKey,
      setGrokApiKey,
      hasGrokKey,
      isAiEnabled,
    }}>
      {children}
    </EnvContext.Provider>
  );
};

export const useEnv = () => {
  const context = useContext(EnvContext);
  if (context === undefined) {
    throw new Error('useEnv must be used within an EnvProvider');
  }
  return context;
};
