/**
 * Native CryptoContext — real encryption gate using SecureStore + LocalAuthentication.
 * Matches the web API surface so LockScreen and the rest of the app work unchanged.
 *
 * Security notes:
 * - Master password is the root of trust (PBKDF2 100k + verifier).
 * - Biometrics are convenience only (they only retrieve the password from SecureStore).
 * - Derived key lives only in React memory for the session.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  isEncryptionSetup,
  setupEncryption,
  unlockWithPassword,
  changeEncryptionPassword,
  isBiometricSupported,
  isBiometricEnrolled,
  enrollBiometric as enrollBiometricStorage,
  authenticateWithBiometric,
  updateBiometricPassword,
  removeBiometric as removeBiometricStorage,
} from '../utils/bpStorage';

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

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [isSetup, setIsSetup] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [cryptoKey, setCryptoKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [autoLockMinutes, setAutoLockMinutesState] = useState(10);
  const [failedUnlockAttempts, setFailedUnlockAttempts] = useState(0);

  const setAutoLockMinutes = useCallback((minutes: number) => {
    setAutoLockMinutesState(Math.max(1, Math.min(60, minutes)));
  }, []);

  useEffect(() => {
    Promise.all([isEncryptionSetup(), isBiometricSupported(), isBiometricEnrolled()])
      .then(([setup, bioSupported, bioEnrolled]) => {
        setIsSetup(setup);
        setBiometricSupported(bioSupported);
        setBiometricEnrolled(bioEnrolled);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setupPassword = useCallback(async (password: string) => {
    const key = await setupEncryption(password);
    setIsSetup(true);
    setCryptoKey(key);
    setMasterPassword(password);
    setIsUnlocked(true);
  }, []);

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    const key = await unlockWithPassword(password);
    if (key) {
      setCryptoKey(key);
      setMasterPassword(password);
      setIsUnlocked(true);
      setFailedUnlockAttempts(0);
      return true;
    }
    setFailedUnlockAttempts((prev) => prev + 1);
    return false;
  }, []);

  const unlockWithBiometricFn = useCallback(async (): Promise<boolean> => {
    try {
      const password = await authenticateWithBiometric();
      if (!password) return false;
      const key = await unlockWithPassword(password);
      if (!key) return false;
      setCryptoKey(key);
      setMasterPassword(password);
      setIsUnlocked(true);
      setFailedUnlockAttempts(0);
      return true;
    } catch {
      return false;
    }
  }, []);

  const lock = useCallback(() => {
    setCryptoKey(null);
    setMasterPassword('');
    setIsUnlocked(false);
  }, []);

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      if (!cryptoKey) throw new Error('Not unlocked');
      const verified = await unlockWithPassword(oldPassword);
      if (!verified) throw new Error('Incorrect current password');
      const newKey = await changeEncryptionPassword(cryptoKey, newPassword);
      setCryptoKey(newKey);
      setMasterPassword(newPassword);
      if (biometricEnrolled) {
        await updateBiometricPassword(newPassword);
      }
    },
    [cryptoKey, biometricEnrolled]
  );

  const enrollBiometric = useCallback(async () => {
    if (!masterPassword) throw new Error('Must be unlocked to enroll biometrics');
    await enrollBiometricStorage(masterPassword);
    setBiometricEnrolled(true);
  }, [masterPassword]);

  const removeBiometric = useCallback(async () => {
    await removeBiometricStorage();
    setBiometricEnrolled(false);
  }, []);

  // Auto-lock when app goes to background for longer than the timeout
  useEffect(() => {
    if (!isUnlocked) return;

    let backgroundTimestamp: number | null = null;

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestamp = Date.now();
      } else if (nextState === 'active' && backgroundTimestamp) {
        const elapsed = Date.now() - backgroundTimestamp;
        if (elapsed > autoLockMinutes * 60 * 1000) {
          lock();
        }
        backgroundTimestamp = null;
      }
    });

    return () => subscription.remove();
  }, [isUnlocked, lock, autoLockMinutes]);

  return (
    <CryptoContext.Provider
      value={{
        isSetup,
        isUnlocked,
        cryptoKey,
        isLoading,
        biometricSupported,
        biometricEnrolled,
        autoLockMinutes,
        failedUnlockAttempts,
        setAutoLockMinutes,
        setupPassword,
        unlock,
        unlockWithBiometric: unlockWithBiometricFn,
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
