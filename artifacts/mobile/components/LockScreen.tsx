import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { useColors } from '../hooks/useColors';
import { useCrypto } from '../context/CryptoContext';
import { getPasswordStrength } from '../utils/crypto';

type Mode = 'setup' | 'biometric' | 'password';

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

  const initialMode: Mode = !isSetup ? 'setup' : biometricEnrolled && biometricSupported ? 'biometric' : 'password';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [bioError, setBioError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const didAutoTrigger = useRef(false);

  // Subtle pulse for biometric button
  useEffect(() => {
    if (mode !== 'biometric') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mode, pulseAnim]);

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
  const passwordsMatch = confirm === password;
  const canSubmit = (() => {
    if (isLoading || !password) return false;
    if (mode === 'setup') {
      return (strength?.score ?? 0) >= 2 && passwordsMatch && confirm.length > 0;
    }
    return true;
  })();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    setError('');
    try {
      if (mode === 'setup') {
        if (!passwordsMatch) {
          setError('Passwords do not match.');
          return;
        }
        await setupPassword(password);
      } else {
        const ok = await unlock(password);
        if (!ok) {
          setError('Incorrect password. Please try again.');
          setPassword('');
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
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
            <Animated.View
              style={[
                styles.biometricRing,
                {
                  borderColor: bioLoading ? colors.mutedForeground : colors.primary,
                  transform: [{ scale: pulseAnim }],
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
            </Animated.View>
          </TouchableOpacity>

          <Text style={[styles.bioLabel, { color: colors.foreground }]}>
            {bioLoading ? 'Waiting for biometric…' : 'Tap to unlock with biometrics'}
          </Text>
          <Text style={[styles.bioSub, { color: colors.mutedForeground }]}>
            Use your fingerprint or Face ID to access your data
          </Text>

          <Text style={[styles.bioWarning, { color: colors.mutedForeground }]}>
            Biometrics are a convenience feature only. Your master password is still required for full security.
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

          <View style={[styles.encryptedBadge, { backgroundColor: (colors.normal || '#22C55E') + '18' }]}>
            <Feather name="shield" size={12} color={colors.normal || '#22C55E'} />
            <Text style={[styles.encryptedText, { color: colors.normal || '#22C55E' }]}>
              AES-256-GCM · PBKDF2 · 100,000 iterations
            </Text>
          </View>
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
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '22' }]}>
          <Feather name="shield" size={36} color={colors.primary} />
        </View>

        <Text style={[styles.appName, { color: colors.primary }]}>BP Tracker</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {mode === 'setup' ? 'Secure your health data' : 'Welcome back'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {mode === 'setup'
            ? 'Create a strong master password to encrypt all your readings with AES-256-GCM + PBKDF2. Your data stays private — even if your device is lost. There is no password recovery.'
            : 'Enter your master password to access your blood pressure readings.'}
        </Text>

        {mode === 'setup' && (
          <View style={[styles.tipBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
              Use at least 12 characters with mixed case, numbers, and symbols. This password protects everything.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          {/* Password field */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {mode === 'setup' ? 'Master Password' : 'Password'}
          </Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
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

          {/* Strength meter (setup only) */}
          {mode === 'setup' && password.length > 0 && strength && (
            <View style={styles.strengthRow}>
              <View style={styles.strengthBars}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          i < strength.score ? strength.color : colors.border,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>
                {strength.label}
              </Text>
            </View>
          )}

          {/* Confirm field (setup only) */}
          {mode === 'setup' && (
            <>
              <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>
                Confirm Password
              </Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Confirm password"
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

          {error ? (
            <View style={[styles.errorWrap, { backgroundColor: (colors.crisis || '#EF4444') + '18', marginTop: 16 }]}>
              <Feather name="alert-circle" size={14} color={colors.crisis || '#EF4444'} />
              <Text style={[styles.errorText, { color: colors.crisis || '#EF4444' }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: canSubmit ? colors.primary : colors.border,
                opacity: canSubmit ? 1 : 0.6,
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
                {mode === 'setup' ? 'Create Password & Continue' : 'Unlock'}
              </Text>
            )}
          </TouchableOpacity>

          {mode === 'password' && biometricSupported && (
            <TouchableOpacity
              style={styles.switchMode}
              onPress={() => setMode('biometric')}
            >
              <Feather name="smartphone" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: 8 }}>Use Biometrics</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.encryptedBadge, { backgroundColor: (colors.normal || '#22C55E') + '18', marginTop: 32 }]}>
          <Feather name="shield" size={12} color={colors.normal || '#22C55E'} />
          <Text style={[styles.encryptedText, { color: colors.normal || '#22C55E' }]}>
            AES-256-GCM · PBKDF2 · 100,000 iterations
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, alignItems: 'center' },
  biometricContent: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: { fontSize: 15, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 20, maxWidth: 340 },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    width: '100%',
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },
  form: { width: '100%', marginTop: 8 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '600' },
  matchError: { fontSize: 12, marginTop: 6 },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  errorText: { fontSize: 13, flex: 1 },
  submitBtn: {
    marginTop: 24,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontSize: 16, fontWeight: '600' },
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
  bioWarning: { fontSize: 12, textAlign: 'center', marginTop: 4, maxWidth: 280, lineHeight: 17 },
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
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 20,
  },
  encryptedText: { fontSize: 11, fontWeight: '500' },
});
