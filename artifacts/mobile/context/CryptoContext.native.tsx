/**
 * Native CryptoContext â€” hardened session management.
 *
 * Security posture:
 * - Master password is the root of trust (PBKDF2 100k + AES-GCM verifier).
 * - Derived key lives only in React memory for the unlocked session.
 * - Password string is NOT kept in state long-term; only a short-lived ref for biometric enroll.
 * - On lock: key nulled, password ref cleared, failed-attempt counter retained for lockout.
 * - Progressive delay after failed unlock attempts (anti brute-force).
 * - Auto-lock on background after configured timeout.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
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
} from '@/utils/bpStorage';
import { lockHomeWidget } from '@/widget/bridge';

export interface CryptoContextType {
  isSetup: boolean;
  isUnlocked: boolean;
  cryptoKey: unknown;
  isLoading: boolean;
  biometricSupported: boolean;
  biometricEnrolled: boolean;
  autoLockMinutes: number;
  failedUnlockAttempts: number;
  lockoutRemainingMs: number;
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

/** Progressive lockout: 0s, 2s, 5s, 15s, 30s, 60s... */
function lockoutMsForAttempts(attempts: number): number {
  if (attempts <= 0) return 0;
  const table = [0, 0, 2000, 5000, 15000, 30000, 60000];
  return table[Math.min(attempts, table.length - 1)] ?? 60000;
}

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [isSetup, setIsSetup] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [autoLockMinutes, setAutoLockMinutesState] = useState(5); // tighter default
  const [failedUnlockAttempts, setFailedUnlockAttempts] = useState(0);
  const [lockoutRemainingMs, setLockoutRemainingMs] = useState(0);

  // Password held only in a ref for biometric enroll â€” not in React state (reduces snapshot surface)
  const passwordRef = useRef<string>('');
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setAutoLockMinutes = useCallback((minutes: number) => {
    setAutoLockMinutesState(Math.max(1, Math.min(60, minutes)));
  }, []);

  const clearSensitiveMemory = useCallback(() => {
    passwordRef.current = '';
    setCryptoKey(null);
    setIsUnlocked(false);
    void lockHomeWidget();
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

  // Tick down lockout
  useEffect(() => {
    if (lockoutRemainingMs <= 0) {
      if (lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current);
        lockoutTimerRef.current = null;
      }
      return;
    }
    lockoutTimerRef.current = setInterval(() => {
      setLockoutRemainingMs((prev) => {
        if (prev <= 250) {
          if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
          return 0;
        }
        return prev - 250;
      });
    }, 250);
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    };
  }, [lockoutRemainingMs > 0]);

  const setupPassword = useCallback(async (password: string) => {
    const key = await setupEncryption(password);
    setIsSetup(true);
    setCryptoKey(key as CryptoKey);
    passwordRef.current = password; // needed briefly if user enrolls biometrics next
    setIsUnlocked(true);
    setFailedUnlockAttempts(0);
  }, []);

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    if (lockoutRemainingMs > 0) return false;

    const key = await unlockWithPassword(password);
    if (key) {
      setCryptoKey(key as CryptoKey);
      passwordRef.current = password;
      setIsUnlocked(true);
      setFailedUnlockAttempts(0);
      setLockoutRemainingMs(0);
      return true;
    }

    setFailedUnlockAttempts((prev) => {
      const next = prev + 1;
      const delay = lockoutMsForAttempts(next);
      if (delay > 0) setLockoutRemainingMs(delay);
      return next;
    });
    return false;
  }, [lockoutRemainingMs]);

  const unlockWithBiometricFn = useCallback(async (): Promise<boolean> => {
    if (lockoutRemainingMs > 0) return false;
    try {
      const password = await authenticateWithBiometric();
      if (!password) return false;
      const key = await unlockWithPassword(password);
      if (!key) return false;
      setCryptoKey(key as CryptoKey);
      passwordRef.current = password;
      setIsUnlocked(true);
      setFailedUnlockAttempts(0);
      setLockoutRemainingMs(0);
      return true;
    } catch {
      return false;
    }
  }, [lockoutRemainingMs]);

  const lock = useCallback(() => {
    clearSensitiveMemory();
  }, [clearSensitiveMemory]);

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      if (!cryptoKey) throw new Error('Not unlocked');
      const verified = await unlockWithPassword(oldPassword);
      if (!verified) throw new Error('Incorrect current password');
      const newKey = await changeEncryptionPassword(cryptoKey, newPassword);
      setCryptoKey(newKey as CryptoKey);
      passwordRef.current = newPassword;
      if (biometricEnrolled) {
        await updateBiometricPassword(newPassword);
      }
    },
    [cryptoKey, biometricEnrolled]
  );

  const enrollBiometric = useCallback(async () => {
    const pw = passwordRef.current;
    if (!pw) throw new Error('Must be unlocked to enroll biometrics');
    await enrollBiometricStorage(pw);
    setBiometricEnrolled(true);
    // Optionally clear password ref after successful enroll if not needed
    // Keep briefly so changePassword still works in same session
  }, []);

  const removeBiometric = useCallback(async () => {
    await removeBiometricStorage();
    setBiometricEnrolled(false);
  }, []);

  // Auto-lock on background
  useEffect(() => {
    if (!isUnlocked) return;

    let backgroundTimestamp: number | null = null;

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background') {
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
        lockoutRemainingMs,
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

