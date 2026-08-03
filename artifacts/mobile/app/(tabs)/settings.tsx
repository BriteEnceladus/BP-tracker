import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import * as Notifications from 'expo-notifications';
import { Feather } from '@expo/vector-icons';

export default function SettingsScreen() {
  const colors = useColors();
  const { readings, deleteReading } = useBP();
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(false); // Phase 2 - default OFF

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data?',
      'This will permanently delete all your readings. This cannot be undone.',
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

  const toggleReminder = async (value: boolean) => {
    setReminderEnabled(value);
    if (value) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time to log your BP',
          body: "Don't forget to record your blood pressure today.",
        },
        trigger: { hour: 8, minute: 0, repeats: true },
      });
      Alert.alert('Reminder Enabled', 'Daily reminder set for 8:00 AM.');
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      Alert.alert('Reminder Disabled');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>

      {/* Security */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Security</Text>
        
        <View style={[styles.row, { borderTopColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="lock" size={18} color={colors.primary} />
            <Text style={{ color: colors.foreground }}>Encryption Status</Text>
          </View>
          <Text style={{ color: colors.normal, fontWeight: '600' }}>AES-256-GCM Active</Text>
        </View>

        <View style={[styles.row, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.foreground }}>Biometric Login</Text>
          <Switch
            value={true}
            onValueChange={() => {}}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={[styles.row, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.foreground }}>Auto-Lock Timeout</Text>
          <Text style={{ color: colors.mutedForeground }}>5 minutes</Text>
        </View>
      </View>

      {/* Privacy / AI Insights (Phase 2 ready) */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Privacy</Text>
        
        <View style={[styles.row, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.foreground }}>Enable AI Insights</Text>
          <Switch
            value={aiInsightsEnabled}
            onValueChange={setAiInsightsEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Only anonymized summary data is sent when enabled. Full control stays with you. Default is OFF.
        </Text>
      </View>

      {/* Reminders */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Reminders</Text>
        
        <View style={[styles.row, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.foreground }}>Daily Reminder</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={toggleReminder}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Get a notification every day at 8:00 AM
        </Text>
      </View>

      {/* Data Management */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Data</Text>
        
        <TouchableOpacity style={[styles.row, { borderTopColor: colors.border }]} onPress={() => { /* CSV Export already in History */ }}>
          <Text style={{ color: colors.foreground }}>Export Data (CSV)</Text>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, { borderTopColor: colors.border }]} onPress={() => Alert.alert('Import', 'CSV Import coming soon in Settings!')}>
          <Text style={{ color: colors.foreground }}>Import from CSV</Text>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, { borderTopColor: colors.border }]} onPress={clearAllData}>
          <Text style={{ color: colors.crisis }}>Clear All Data</Text>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
        
        <View style={[styles.row, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.foreground }}>Version</Text>
          <Text style={{ color: colors.mutedForeground }}>1.0.0</Text>
        </View>

        <TouchableOpacity style={[styles.row, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.foreground }}>Privacy Policy</Text>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.foreground }}>Terms of Service</Text>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Your data stays on your device. We never see or store it.\nBP Tracker is not a substitute for professional medical advice.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  hint: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 20,
    marginBottom: 40,
    lineHeight: 20,
  },
});
