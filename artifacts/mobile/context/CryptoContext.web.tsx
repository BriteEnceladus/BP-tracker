import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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
} from "@/utils/bpStorage";

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
  const [cryptoKey, setCryptoKey] = useState<SessionCryptoKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [autoLockMinutes, setAutoLockMinutesState] = useState(10);
  const [failedUnlockAttempts, setFailedUnlockAttempts] = useState(0);

  const setAutoLockMinutes = useCallback((minutes: number) => {
    setAutoLockMinutesState(Math.max(1, Math.min(60, minutes)));
  }, []);

  useEffect(() => {
    Promise.all([
      isEncryptionSetup(),
      isBiometricSupported(),
      isBiometricEnrolled(),
    ])
      .then(([setup, bioSupported, bioEnrolled]) => {
        setIsSetup(setup);
        setBiometricSupported(bioSupported);
        setBiometricEnrolled(bioEnrolled);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setupPassword = useCallback(async (password: string) => {
    const key = (await setupEncryption(password)) as CryptoKey;
    setIsSetup(true);
    setCryptoKey(key);
    setMasterPassword(password);
    setIsUnlocked(true);
  }, []);

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    const key = (await unlockWithPassword(password)) as CryptoKey | null;
    if (key) {
      setCryptoKey(key);
      setMasterPassword(password);
      setIsUnlocked(true);
      setFailedUnlockAttempts(0);
      return true;
    } else {
      setFailedUnlockAttempts(prev => prev + 1);
      return false;
    }
  }, []);

  const unlockWithBiometricFn = useCallback(async (): Promise<boolean> => {
    try {
      const password = await authenticateWithBiometric();
      if (!password) return false;
      const key = (await unlockWithPassword(password)) as CryptoKey | null;
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
    setMasterPassword("");
    setIsUnlocked(false);
  }, []);

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      if (!cryptoKey) throw new Error("Not unlocked");
      const verified = (await unlockWithPassword(oldPassword)) as CryptoKey | null;
      if (!verified) throw new Error("Incorrect current password");
      const newKey = (await changeEncryptionPassword(cryptoKey, newPassword)) as CryptoKey;
      setCryptoKey(newKey);
      setMasterPassword(newPassword);
      if (biometricEnrolled) {
        await updateBiometricPassword(newPassword);
      }
    },
    [cryptoKey, biometricEnrolled]
  );

  const enrollBiometric = useCallback(async () => {
    if (!masterPassword) throw new Error("Must be unlocked to enroll biometrics");
    await enrollBiometricStorage(masterPassword);
    setBiometricEnrolled(true);
  }, [masterPassword]);

  const removeBiometric = useCallback(async () => {
    await removeBiometricStorage();
    setBiometricEnrolled(false);
  }, []);

  // === Auto-lock on inactivity (customizable) ===
  useEffect(() => {
    if (!isUnlocked) return;

    const AUTO_LOCK_MS = autoLockMinutes * 60 * 1000;
    let timeout: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        lock();
      }, AUTO_LOCK_MS);
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
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
  if (!ctx) throw new Error("useCrypto must be used within CryptoProvider");
  return ctx;
}
