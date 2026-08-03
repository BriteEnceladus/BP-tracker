/**
 * Native / shared CryptoContext stub.
 * Allows the app to load on Android / iOS without crashing.
 * Full client-side AES-256-GCM encryption is currently implemented for web only
 * (see CryptoContext.web.tsx + utils/bpStorage.web.ts).
 *
 * TODO: Implement native path with expo-secure-store + expo-crypto + expo-local-authentication.
 */
import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';

export interface CryptoContextType {
  isSetup: boolean;
  isUnlocked: boolean;
  cryptoKey: unknown;
  isLoading: boolean;
  biometricSupported: boolean;
  biometricEnrolled: boolean;
  autoLockMinutes: number;
  failedUnlockAttempts: number;
  setAutoLockMinutes: (minutes: number) => void;
  setupPassword: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  lock: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  enrollBiometric: () => Promise<void>;
  removeBiometric: () => Promise<void>;
}

const CryptoContext = createContext<CryptoContextType | null>(null);

export function CryptoProvider({ children }: { children: ReactNode }) {
  const [isSetup, setIsSetup] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading] = useState(false);
  const [autoLockMinutes, setAutoLockMinutesState] = useState(10);
  const [failedUnlockAttempts, setFailedUnlockAttempts] = useState(0);

  const setAutoLockMinutes = useCallback((minutes: number) => {
    setAutoLockMinutesState(Math.max(1, Math.min(60, minutes)));
  }, []);

  const setupPassword = useCallback(async (_password: string) => {
    // Native encryption not yet implemented — allow unlock for development
    console.warn('[CryptoContext] Native encryption path not yet implemented. Using development unlock.');
    setIsSetup(true);
    setIsUnlocked(true);
  }, []);

  const unlock = useCallback(async (_password: string): Promise<boolean> => {
    console.warn('[CryptoContext] Native encryption path not yet implemented. Using development unlock.');
    setIsUnlocked(true);
    setFailedUnlockAttempts(0);
    return true;
  }, []);

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    console.warn('[CryptoContext] Native biometrics not yet implemented.');
    return false;
  }, []);

  const lock = useCallback(() => {
    setIsUnlocked(false);
  }, []);

  const changePassword = useCallback(async (_old: string, _new: string) => {
    throw new Error('Native password change not yet implemented');
  }, []);

  const enrollBiometric = useCallback(async () => {
    throw new Error('Native biometrics not yet implemented');
  }, []);

  const removeBiometric = useCallback(async () => {
    // no-op
  }, []);

  return (
    <CryptoContext.Provider
      value={{
        isSetup,
        isUnlocked,
        cryptoKey: null,
        isLoading,
        biometricSupported: false,
        biometricEnrolled: false,
        autoLockMinutes,
        failedUnlockAttempts,
        setAutoLockMinutes,
        setupPassword,
        unlock,
        unlockWithBiometric,
        lock,
        changePassword,
        enrollBiometric,
        removeBiometric,
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto(): CryptoContextType {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error('useCrypto must be used within CryptoProvider');
  return ctx;
}
