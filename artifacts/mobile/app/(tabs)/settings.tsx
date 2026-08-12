import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import { Feather } from '@expo/vector-icons';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    readings,
    deleteReading,
    cloudAvailable,
    cloudSignedIn,
    cloudUser,
    cloudSyncing,
    cloudLastSyncedAt,
    cloudError,
    signInCloud,
    signOutCloud,
    syncToCloud,
    pullFromCloud,
  } = useBP();
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const clearAllData = () => {
    Alert.alert(
      'Clear all data on this phone?',
      'Deletes readings stored on this device. Cloud backup (if any) is not deleted until the next upload.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const reading of readings) {
              if (reading.id) await deleteReading(reading.id);
            }
            Alert.alert('Done', 'All readings on this phone were deleted.');
          },
        },
      ]
    );
  };

  const toggleReminder = async (value: boolean) => {
    setReminderEnabled(value);
    if (value) {
      Alert.alert(
        'Reminders',
        'Use your phone’s Clock or Calendar app for a daily BP reminder for now.'
      );
    }
  };

  const onCloudSignIn = async () => {
    try {
      await signInCloud();
      Alert.alert(
        'Cloud connected',
        'Optional backup is on. Your main data still lives on this phone.'
      );
    } catch (e: any) {
      Alert.alert('Sign-in failed', e?.message || 'Could not connect to Puter.');
    }
  };

  const onSync = async () => {
    try {
      await syncToCloud();
      Alert.alert('Uploaded', 'Phone readings backed up to Puter.');
    } catch (e: any) {
      Alert.alert('Sync failed', e?.message || 'Could not sync.');
    }
  };

  const onPull = async () => {
    try {
      await pullFromCloud();
      Alert.alert('Merged', 'Cloud and phone readings were merged.');
    } catch (e: any) {
      Alert.alert('Pull failed', e?.message || 'Could not pull from cloud.');
    }
  };

  const onSignOut = () => {
    Alert.alert(
      'Disconnect cloud?',
      'Readings stay on this phone. You can reconnect anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await signOutCloud();
          },
        },
      ]
    );
  };

  const lastSyncLabel = cloudLastSyncedAt
    ? new Date(cloudLastSyncedAt).toLocaleString()
    : 'Never';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 40 + insets.bottom,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>

      {/* Primary: on-phone storage */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          On this phone
        </Text>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Readings stored here</Text>
          <Text style={{ color: colors.mutedForeground, fontWeight: '700' }}>
            {readings.length}
          </Text>
        </View>
        <View style={styles.pad}>
          <Text style={{ color: colors.mutedForeground, lineHeight: 20, fontSize: 14 }}>
            BP Tracker is built for your phone first. Readings are saved on-device so you can
            log anytime — even offline.
          </Text>
        </View>
        <TouchableOpacity style={styles.row} onPress={clearAllData}>
          <Text style={{ color: colors.crisis }}>Clear phone data</Text>
          <Feather name="trash-2" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Optional cloud backup */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Optional cloud backup
        </Text>

        {!cloudAvailable ? (
          <View style={styles.pad}>
            <Text style={{ color: colors.mutedForeground, lineHeight: 20, fontSize: 14 }}>
              Cloud backup is unavailable on this platform. Readings still save on this device.
              Export CSV from History anytime.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                  {cloudSignedIn ? 'Backup connected' : 'Not connected'}
                </Text>
                <Text style={[styles.hintInline, { color: colors.mutedForeground }]}>
                  {cloudSignedIn
                    ? cloudUser?.username || cloudUser?.email || 'Puter account'
                    : Platform.OS === 'web'
                      ? 'Optional — phone storage works without this'
                      : 'Works on this phone — opens Puter sign-in'}
                </Text>
              </View>
              {cloudSyncing ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: cloudSignedIn ? '#22C55E' : colors.border },
                  ]}
                />
              )}
            </View>

            {cloudError ? (
              <Text style={[styles.errorText, { color: colors.crisis }]}>{cloudError}</Text>
            ) : null}

            {cloudSignedIn ? (
              <>
                <View style={styles.row}>
                  <Text style={{ color: colors.foreground }}>Last backup</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                    {lastSyncLabel}
                  </Text>
                </View>
                <TouchableOpacity style={styles.row} onPress={onSync} disabled={cloudSyncing}>
                  <Text style={{ color: colors.foreground }}>Upload from phone</Text>
                  <Feather name="upload-cloud" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.row} onPress={onPull} disabled={cloudSyncing}>
                  <Text style={{ color: colors.foreground }}>Restore / merge</Text>
                  <Feather name="download-cloud" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.row} onPress={onSignOut}>
                  <Text style={{ color: colors.crisis }}>Disconnect backup</Text>
                  <Feather name="log-out" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={onCloudSignIn}
                disabled={cloudSyncing}
              >
                {cloudSyncing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="cloud" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Connect Puter backup</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Optional. This phone is still the main store; Puter is your cloud backup.
              Same Puter account works across Android, iOS, and web.{' '}
              <Text
                style={{ color: colors.primary }}
                onPress={() => Linking.openURL('https://developer.puter.com')}
              >
                Powered by Puter
              </Text>
            </Text>
          </>
        )}
      </View>

      {/* Reminders */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Reminders</Text>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Daily reminder</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={toggleReminder}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Best on a real phone — use your clock app for a reliable daily ping.
        </Text>
      </View>

      {/* Export */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Export</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            Alert.alert('Export', 'Open the History tab and tap the download icon for CSV.')
          }
        >
          <Text style={{ color: colors.foreground }}>Export CSV</Text>
          <Feather name="download" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Version</Text>
          <Text style={{ color: colors.mutedForeground }}>1.3.0</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Running on</Text>
          <Text style={{ color: colors.mutedForeground }}>
            {Platform.OS === 'web' ? 'Browser (test)' : Platform.OS}
          </Text>
        </View>
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Mobile-first · data on your phone · optional Puter backup{'\n'}
        Not a medical device — personal tracking only.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
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
    minHeight: 52,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.2)',
  },
  pad: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  hint: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 16,
    lineHeight: 18,
  },
  hintInline: {
    fontSize: 13,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  primaryBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
    borderRadius: 14,
    minHeight: 52,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 20,
  },
});
