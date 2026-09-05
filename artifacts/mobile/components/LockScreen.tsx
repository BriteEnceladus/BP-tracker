import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useCrypto } from '@/context/CryptoContext';
import { getPasswordStrength } from '@/utils/crypto';
import { PulseScale } from '@/components/motion';

type Mode = 'setup' | 'biometric' | 'password';

/** Reject if the promise takes longer than `ms` milliseconds. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `${label} took too long. Close Expo Go if that is what you opened, and use the BP Tracker app from your home screen.`
        )
      );
    }, ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

export function LockScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    isSetup,
    biometricEnrolled,
    biometricSupported,
    setupPassword,
    unlock,
    unlockWithBiometric,
  } = useCrypto();

  const initialMode: Mode = !isSetup
    ? 'setup'
    : biometricEnrolled && biometricSupported
      ? 'biometric'
      : 'password';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(''); // live feedback while working
  const [bioError, setBioError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const didAutoTrigger = useRef(false);

  useEffect(() => {
    if (mode !== 'biometric' || didAutoTrigger.current) return;
    didAutoTrigger.current = true;
    const t = setTimeout(() => triggerBiometric(), 700);
    return () => clearTimeout(t);
  }, [mode]);

  const triggerBiometric = async () => {
    setBioLoading(true);
    setBioError('');
    try {
      const success = await unlockWithBiometric();
      if (!success) {
        setBioError('Authentication failed. Try again or use your password.');
      }
    } catch {
      setBioError('Biometrics unavailable. Use your password.');
    } finally {
      setBioLoading(false);
    }
  };

  const strength = mode === 'setup' ? getPasswordStrength(password) : null;
  const passwordsMatch = confirm === password && confirm.length > 0;

  const reqs = {
    length: password.length >= 12,
    mixedCase: /[A-Z]/.test(password) && /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const canSubmit = (() => {
    if (isLoading || !password) return false;
    if (mode === 'setup') {
      return (strength?.score ?? 0) >= 2 && passwordsMatch;
    }
    return true;
  })();

  const disabledReason = (() => {
    if (mode !== 'setup' || isLoading || canSubmit) return null;
    if (!password) return null;
    if ((strength?.score ?? 0) < 2) return 'Password is still too weak — meet more requirements above.';
    if (!confirm) return 'Confirm your password to continue.';
    if (!passwordsMatch) return 'Passwords do not match.';
    return null;
  })();

  const handleSubmit = async () => {
    if (!canSubmit || isLoading) return;

    setIsLoading(true);
    setError('');
    setStatus(mode === 'setup' ? 'Saving...' : 'Unlocking...');

    try {
      if (mode === 'setup') {
        if (!passwordsMatch) {
          setError('Passwords do not match.');
          return;
        }
        // Hard timeout so a hanging native module is never silent
        await withTimeout(setupPassword(password), 12000, 'Password setup');
        setStatus('Done');
        // On success isUnlocked flips and this screen unmounts
      } else {
        const ok = await withTimeout(unlock(password), 12000, 'Unlock');
        if (!ok) {
          setError('Incorrect password. Please try again.');
          setPassword('');
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Something went wrong. Please try again.';
      console.error('[LockScreen] submit failed', err);
      setError(message);
      setStatus('');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Biometric mode ----------
  if (mode === 'biometric') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.biometricContent,
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '22' }]}>
            <Feather name="shield" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>BP Tracker</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>

          <TouchableOpacity
            onPress={triggerBiometric}
            disabled={bioLoading}
            activeOpacity={0.8}
            style={styles.biometricBtnWrap}
          >
            <PulseScale active={!bioLoading}>
              <View
                style={[
                  styles.biometricRing,
                  {
                    borderColor: bioLoading ? colors.mutedForeground : colors.primary,
                  },
                ]}
              >
                <View
                  style={[
                    styles.biometricInner,
                    { backgroundColor: bioLoading ? colors.border : colors.primary + '22' },
                  ]}
                >
                  {bioLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                  ) : (
                    <Feather name="smartphone" size={48} color={colors.primary} />
                  )}
                </View>
              </View>
            </PulseScale>
          </TouchableOpacity>

          <Text style={[styles.bioLabel, { color: colors.foreground }]}>
            {bioLoading ? 'Waiting for biometric…' : 'Tap to unlock with biometrics'}
          </Text>
          <Text style={[styles.bioSub, { color: colors.mutedForeground }]}>
            Use your fingerprint or Face ID to access your data
          </Text>

          <Text style={[styles.bioWarning, { color: colors.mutedForeground }]}>
            You can still unlock with your password anytime.
          </Text>

          {bioError ? (
            <View style={[styles.errorWrap, { backgroundColor: (colors.crisis || '#EF4444') + '18' }]}>
              <Feather name="alert-circle" size={14} color={colors.crisis || '#EF4444'} />
              <Text style={[styles.errorText, { color: colors.crisis || '#EF4444' }]}>{bioError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.usePasswordBtn, { borderColor: colors.border }]}
            onPress={() => {
              setMode('password');
              setBioError('');
            }}
            activeOpacity={0.7}
          >
            <Feather name="lock" size={14} color={colors.mutedForeground} />
            <Text style={[styles.usePasswordText, { color: colors.mutedForeground }]}>
              Use Password Instead
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    );
  }

  // ---------- Setup / Password mode ----------
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
          <Feather name="shield" size={34} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {mode === 'setup' ? 'Create Your Password' : 'Welcome back'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {mode === 'setup'
            ? 'Choose a password you will remember. There is no reset.'
            : 'Enter your password to open BP Tracker.'}
        </Text>

        <View style={styles.form}>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.card,
                borderColor: password.length > 0 ? colors.primary : colors.border,
              },
            ]}
          >
            <Feather name="lock" size={18} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError('');
              }}
              placeholder={mode === 'setup' ? 'Password' : 'Enter password'}
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={mode === 'setup' ? 'newPassword' : 'password'}
              returnKeyType={mode === 'setup' ? 'next' : 'done'}
              onSubmitEditing={mode === 'setup' ? undefined : handleSubmit}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={12}>
              <Feather
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          {mode === 'setup' && password.length > 0 && strength && (
            <View style={styles.strengthSection}>
              <View style={styles.strengthHeader}>
                <Text style={[styles.strengthTitle, { color: colors.mutedForeground }]}>
                  Password Strength
                </Text>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
              <View style={[styles.strengthTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${Math.min(100, (strength.score / 4) * 100)}%`,
                      backgroundColor: strength.color,
                    },
                  ]}
                />
              </View>
              <View style={styles.strengthLabels}>
                <Text style={[styles.strengthHint, { color: colors.mutedForeground }]}>Weak</Text>
                <Text style={[styles.strengthHint, { color: colors.mutedForeground }]}>Fair</Text>
                <Text style={[styles.strengthHint, { color: colors.mutedForeground }]}>Strong</Text>
              </View>
            </View>
          )}

          {mode === 'setup' && (
            <>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      confirm.length > 0
                        ? passwordsMatch
                          ? colors.primary
                          : colors.crisis || '#EF4444'
                        : colors.border,
                    marginTop: 14,
                  },
                ]}
              >
                <Feather name="lock" size={18} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={confirm}
                  onChangeText={(t) => {
                    setConfirm(t);
                    setError('');
                  }}
                  placeholder="Confirm Password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={12}>
                  <Feather
                    name={showConfirm ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
              {confirm.length > 0 && !passwordsMatch && (
                <Text style={[styles.matchError, { color: colors.crisis || '#EF4444' }]}>
                  Passwords do not match
                </Text>
              )}
            </>
          )}

          {mode === 'setup' && (
            <View style={styles.checklist}>
              <ChecklistItem met={reqs.length} label="At least 12 characters" colors={colors} />
              <ChecklistItem
                met={reqs.mixedCase}
                label="Uppercase and lowercase letters"
                colors={colors}
              />
              <ChecklistItem met={reqs.number} label="At least one number" colors={colors} />
              <ChecklistItem
                met={reqs.special}
                label="At least one special character"
                colors={colors}
              />
            </View>
          )}

          {error ? (
            <View
              style={[
                styles.errorWrap,
                { backgroundColor: (colors.crisis || '#EF4444') + '18', marginTop: 16 },
              ]}
            >
              <Feather name="alert-circle" size={14} color={colors.crisis || '#EF4444'} />
              <Text style={[styles.errorText, { color: colors.crisis || '#EF4444' }]}>{error}</Text>
            </View>
          ) : null}

          {mode === 'setup' && (
            <View
              style={[styles.bioTeaser, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.bioTeaserIcon, { backgroundColor: colors.primary + '18' }]}>
                <Feather name="lock" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.bioTeaserText, { color: colors.mutedForeground }]}>
                Next: You can enable Face ID / fingerprint for faster unlock.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: canSubmit ? colors.primary : colors.border,
                opacity: canSubmit ? 1 : 0.55,
              },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground || '#fff'} />
            ) : (
              <Text style={[styles.submitText, { color: colors.primaryForeground || '#fff' }]}>
                {mode === 'setup' ? 'Continue' : 'Unlock'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Live status while working */}
          {isLoading && status ? (
            <Text style={[styles.statusText, { color: colors.primary }]}>{status}</Text>
          ) : null}

          {disabledReason ? (
            <Text style={[styles.disabledHint, { color: colors.mutedForeground }]}>
              {disabledReason}
            </Text>
          ) : null}

          {mode === 'password' && biometricSupported && (
            <TouchableOpacity style={styles.switchMode} onPress={() => setMode('biometric')}>
              <Feather name="smartphone" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: 8 }}>Use Biometrics</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ChecklistItem({
  met,
  label,
  colors,
}: {
  met: boolean;
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.checkRow}>
      <View
        style={[
          styles.checkCircle,
          {
            backgroundColor: met ? colors.primary : 'transparent',
            borderColor: met ? colors.primary : colors.border,
          },
        ]}
      >
        {met && <Feather name="check" size={12} color="#fff" />}
      </View>
      <Text
        style={[
          styles.checkLabel,
          { color: met ? colors.foreground : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, alignItems: 'center' },
  biometricContent: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  appName: { fontSize: 15, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    maxWidth: 320,
  },
  form: { width: '100%' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  strengthSection: { marginTop: 14, marginBottom: 4 },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthTitle: { fontSize: 12, fontWeight: '500' },
  strengthLabel: { fontSize: 12, fontWeight: '700' },
  strengthTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  strengthHint: { fontSize: 11 },
  matchError: { fontSize: 12, marginTop: 6, marginLeft: 4 },
  checklist: {
    marginTop: 18,
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: { fontSize: 14, flex: 1 },
  bioTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  bioTeaserIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioTeaserText: { flex: 1, fontSize: 13, lineHeight: 18 },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  errorText: { fontSize: 13, flex: 1 },
  submitBtn: {
    marginTop: 22,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontSize: 16, fontWeight: '600' },
  statusText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  disabledHint: {
    marginTop: 10,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  switchMode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 10,
  },
  biometricBtnWrap: { marginVertical: 28 },
  biometricRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioLabel: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  bioSub: { fontSize: 14, textAlign: 'center', marginBottom: 8 },
  bioWarning: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
    lineHeight: 17,
  },
  usePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  usePasswordText: { fontSize: 14, fontWeight: '500' },
});
