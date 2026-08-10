import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIVACY_URL =
  'https://github.com/BriteEnceladus/BP-tracker/blob/main/PRIVACY.md';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { readings, deleteReading } = useBP();
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data?',
      'This will permanently delete all your readings on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            for (const reading of readings) {
              if (reading.id) await deleteReading(reading.id);
            }
            Alert.alert('Data Cleared', 'All readings have been deleted.');
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

      {/* Legal / Medical notice */}
      <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="alert-circle" size={18} color={colors.primary} />
        <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
          BP Tracker is a personal wellness tracking tool only. It is{' '}
          <Text style={{ fontWeight: '700', color: colors.foreground }}>not a regulated medical device</Text>
          {' '}and does not diagnose, treat, or replace professional medical advice.
        </Text>
      </View>

      {/* Privacy & Security */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Privacy & Security</Text>

        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Data location</Text>
          <Text style={{ color: colors.normal || '#22C55E', fontWeight: '600' }}>On this device only</Text>
        </View>

        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Encryption</Text>
          <Text style={{ color: colors.mutedForeground }}>AES-256-GCM</Text>
        </View>

        <TouchableOpacity style={styles.row} onPress={openPrivacy}>
          <Text style={{ color: colors.foreground }}>Privacy Policy</Text>
          <Feather name="external-link" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Reminders */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Reminders</Text>

        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Daily Reminder</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Local notification only. Nothing is sent off your device.
        </Text>
      </View>

      {/* Data */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Data</Text>

        <TouchableOpacity style={styles.row} onPress={clearAllData}>
          <Text style={{ color: colors.crisis || '#EF4444' }}>Clear All Readings</Text>
          <Feather name="trash-2" size={18} color={colors.crisis || '#EF4444'} />
        </TouchableOpacity>
      </View>

      {/* About */}
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
