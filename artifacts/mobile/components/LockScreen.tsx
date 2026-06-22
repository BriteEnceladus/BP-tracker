import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCrypto } from "@/context/CryptoContext";
import { getPasswordStrength } from "@/utils/crypto";

type Mode = "setup" | "biometric" | "password";

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

  const initialMode: Mode = !isSetup ? "setup" : biometricEnrolled ? "biometric" : "password";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [bioError, setBioError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const didAutoTrigger = useRef(false);

  useEffect(() => {
    if (mode !== "biometric" || didAutoTrigger.current) return;
    didAutoTrigger.current = true;
    const t = setTimeout(() => triggerBiometric(), 600);
    return () => clearTimeout(t);
  }, [mode]);

  const triggerBiometric = async () => {
    setBioLoading(true);
    setBioError("");
    try {
      const success = await unlockWithBiometric();
      if (!success) {
        setBioError("Authentication failed. Try again or use your password.");
      }
    } catch {
      setBioError("Biometrics unavailable. Use your password.");
    } finally {
      setBioLoading(false);
    }
  };

  const strength = mode === "setup" ? getPasswordStrength(password) : null;
  const passwordsMatch = confirm === password;
  const canSubmit = (() => {
    if (isLoading || !password) return false;
    if (mode === "setup") {
      return (strength?.score ?? 0) >= 2 && passwordsMatch && confirm.length > 0;
    }
    return true;
  })();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    setError("");
    try {
      if (mode === "setup") {
        if (!passwordsMatch) { setError("Passwords do not match."); return; }
        await setupPassword(password);
      } else {
        const ok = await unlock(password);
        if (!ok) { setError("Incorrect password. Please try again."); setPassword(""); }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "biometric") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.biometricContent,
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="shield" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            BP Tracker
          </Text>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Welcome back
          </Text>

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
                  { backgroundColor: bioLoading ? colors.muted : colors.primary + "22" },
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

          <Text style={[styles.bioLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {bioLoading ? "Waiting for biometric…" : "Tap to unlock with biometrics"}
          </Text>
          <Text style={[styles.bioSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Use your fingerprint or Face ID to access your data
          </Text>

          {/* Biometric convenience warning */}
          <Text style={[styles.bioWarning, { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", marginTop: 8 }]}>
            Biometrics are a convenience feature only. Your master password is still required for full security.
          </Text>

          {bioError ? (
            <View style={[styles.errorWrap, { backgroundColor: colors.destructive + "18" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                {bioError}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.usePasswordBtn, { borderColor: colors.border }]}
            onPress={() => { setMode("password"); setBioError(""); }}
            activeOpacity={0.7}
          >
            <Feather name="lock" size={14} color={colors.mutedForeground} />
            <Text style={[styles.usePasswordText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              Use Password Instead
            </Text>
          </TouchableOpacity>

          <View style={[styles.encryptedBadge, { backgroundColor: colors.normal + "18", borderRadius: 20 }]}>
            <Feather name="shield" size={12} color={colors.normal} />
            <Text style={[styles.encryptedText, { color: colors.normal, fontFamily: "Inter_500Medium" }]}>
              AES-256-GCM · PBKDF2 · 100,000 iterations
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="shield" size={36} color={colors.primary} />
        </View>

        <Text style={[styles.appName, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
          BP Tracker
        </Text>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {mode === "setup" ? "Secure your health data" : "Welcome back"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {mode === "setup"
            ? "Create a strong master password to encrypt all your readings with AES-256-GCM + PBKDF2. Your data stays private — even if your device is lost or compromised. There is no password recovery."
            : "Enter your master password to access your blood pressure readings."}
        </Text>

        {mode === "setup" && (
          <View style={[styles.tipBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
              Tip: Use at least 12 characters with mixed case, numbers, and symbols. This password protects everything.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          {/* Form fields... */}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Note: Full styles and component code truncated. Key improvements: Enhanced setup messaging + security tip box for better onboarding.