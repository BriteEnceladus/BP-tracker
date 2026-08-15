import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import { useMeds } from '../../context/MedsContext';
import { useCrypto } from '../../context/CryptoContext';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { readingsToCsv } from '../../utils/csvExport';
import { shareCsvFile } from '../../utils/csvShare';
import { isDailyReminderEnabled, setDailyReminderEnabled } from '../../utils/reminders';
import * as readingsStore from '../../src/readingsStore';
import * as medsStore from '../../src/medsStore';

const PRIVACY_URL =
  'https://github.com/BriteEnceladus/BP-tracker/blob/main/PRIVACY.md';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { readings, refresh } = useBP();
  const { medications, refresh: refreshMeds } = useMeds();
  const {
    biometricSupported,
    biometricEnrolled,
    enrollBiometric,
    removeBiometric,
    autoLockMinutes,
    setAutoLockMinutes,
    lock,
  } = useCrypto();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);

  useEffect(() => {
    isDailyReminderEnabled().then(setReminderEnabled).catch(() => {});
  }, []);

  const toggleReminder = async (value: boolean) => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available on web', 'Daily reminders are available in the Android and iOS apps.');
      return;
    }
    setReminderBusy(true);
    try {
      await setDailyReminderEnabled(value);
      setReminderEnabled(value);
      Alert.alert(
        value ? 'Reminder Enabled' : 'Reminder Disabled',
        value ? 'You will get a local notification every day at 8:00 AM.' : undefined
      );
    } catch {
      setReminderEnabled(false);
      Alert.alert('Permission needed', 'Enable notifications to set a daily reminder.');
    } finally {
      setReminderBusy(false);
    }
  };

  const toggleBiometric = async (value: boolean) => {
    try {
      if (value) {
        await enrollBiometric();
      } else {
        await removeBiometric();
      }
    } catch {
      Alert.alert(
        'Biometric setup failed',
        'Unlock with your password first, then try enabling biometrics again.'
      );
    }
  };

  const exportCsv = async () => {
    if (readings.length === 0) {
      Alert.alert('No Data', 'There are no readings to export.');
      return;
    }
    try {
      const csv = readingsToCsv(readings);
      const fileName = `bp_readings_${new Date().toISOString().split('T')[0]}.csv`;
      await shareCsvFile(csv, fileName);
    } catch {
      Alert.alert('Export Failed', 'Unable to export the CSV file. Please try again.');
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data?',
      `This permanently deletes ${readings.length} reading(s) and ${medications.length} medication(s) on this device. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await readingsStore.clearAllReadings();
              await medsStore.clearAllMedications();
              await refresh();
              await refreshMeds();
              Alert.alert('Data Cleared', 'All readings and medications have been deleted.');
            } catch {
              Alert.alert('Error', 'Could not clear all data.');
            }
          },
        },
      ]
    );
  };

  const openPrivacy = async () => {
    try {
      await Linking.openURL(PRIVACY_URL);
    } catch {
      Alert.alert('Unable to open', 'Please visit the GitHub repository for the Privacy Policy.');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>

      <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="alert-circle" size={18} color={colors.primary} />
        <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
          BP Tracker is a personal wellness tracking tool only. It is{' '}
          <Text style={{ fontWeight: '700', color: colors.foreground }}>not a regulated medical device</Text>
          {' '}and does not diagnose, treat, or replace professional medical advice.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Privacy & Security</Text>

        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Data location</Text>
          <Text style={{ color: colors.normal, fontWeight: '600' }}>On this device only</Text>
        </View>

        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Encryption</Text>
          <Text style={{ color: colors.mutedForeground }}>AES-256-GCM</Text>
        </View>

        {biometricSupported ? (
          <View style={styles.row}>
            <Text style={{ color: colors.foreground }}>Biometric unlock</Text>
            <Switch
              value={biometricEnrolled}
              onValueChange={toggleBiometric}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        ) : null}

        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Auto-lock</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[5, 10, 15].map((mins) => (
              <TouchableOpacity
                key={mins}
                onPress={() => setAutoLockMinutes(mins)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: autoLockMinutes === mins ? colors.primary : colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: autoLockMinutes === mins ? colors.primaryForeground : colors.foreground,
                    fontSize: 12,
                  }}
                >
                  {mins}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.row} onPress={lock}>
          <Text style={{ color: colors.foreground }}>Lock now</Text>
          <Feather name="lock" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={openPrivacy}>
          <Text style={{ color: colors.foreground }}>Privacy Policy</Text>
          <Feather name="external-link" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Reminders</Text>

        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Daily Reminder</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={toggleReminder}
            disabled={reminderBusy}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Local notification at 8:00 AM. Nothing is sent off your device.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Data</Text>

        <TouchableOpacity style={styles.row} onPress={exportCsv}>
          <Text style={{ color: colors.foreground }}>Export readings (CSV)</Text>
          <Feather name="download" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          CSV files are plaintext. Treat exported files as sensitive.
        </Text>

        <TouchableOpacity style={styles.row} onPress={clearAllData}>
          <Text style={{ color: colors.crisis }}>Clear All Data</Text>
          <Feather name="trash-2" size={18} color={colors.crisis} />
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>

        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Version</Text>
          <Text style={{ color: colors.mutedForeground }}>1.0.0</Text>
        </View>

        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Medical device?</Text>
          <Text style={{ color: colors.mutedForeground }}>No</Text>
        </View>
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Your data stays on your device. We never see, store, or transmit it.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  notice: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  hint: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
});
