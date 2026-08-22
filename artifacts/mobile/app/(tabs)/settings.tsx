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
  TextInput,
} from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import { useGlucose } from '../../context/GlucoseContext';
import { useMeds } from '../../context/MedsContext';
import { useCrypto } from '../../context/CryptoContext';
import { useAiSettings } from '../../context/AiSettingsContext';
import { usePremium } from '../../context/PremiumContext';
import { useGlucosePrefs } from '../../context/GlucosePrefsContext';
import { useTarget } from '../../context/TargetContext';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { glucoseToCsv, readingsToCsv } from '../../utils/csvExport';
import { shareCsvFile } from '../../utils/csvShare';
import { isDuplicateReading, parseCsvReadings } from '../../utils/csvImport';
import { pickTextFile } from '../../utils/filePick';
import { getReminderSettings, saveReminderSettings, type ReminderSettings } from '../../utils/reminders';
import { createEncryptedBackup, decryptBackup, isEncryptedBackupFile } from '../../utils/backup';
import { pickBackupFile, shareBackupFile } from '../../utils/backupShare';
import { sharePdfReport } from '../../utils/pdfShare';
import { isProtocolHidden, setProtocolHidden } from '../../utils/protocolHelper';
import { getGlucoseReadingsForDays } from '../../utils/glucoseUtils';
import { parseGlucoseTargetMgdl } from '../../utils/targets';
import { buildWidgetSnapshot } from '../../utils/widgetSnapshot';
import {
  disableHomeWidget,
  getWidgetEnabled,
  pinHomeWidget,
  publishWidgetSnapshot,
  setWidgetEnabled,
} from '../../widget/bridge';
import * as readingsStore from '../../src/readingsStore';
import * as medsStore from '../../src/medsStore';
import * as glucoseStore from '../../src/glucoseStore';
import type { SessionCryptoKey } from '../../utils/crypto';

const PRIVACY_URL =
  'https://github.com/BriteEnceladus/BP-tracker/blob/main/PRIVACY.md';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { readings, refresh, addReading } = useBP();
  const { glucose, refresh: refreshGlucose, addGlucose } = useGlucose();
  const { medications, refresh: refreshMeds } = useMeds();
  const {
    biometricSupported,
    biometricEnrolled,
    enrollBiometric,
    removeBiometric,
    autoLockMinutes,
    setAutoLockMinutes,
    lock,
    cryptoKey,
  } = useCrypto();
  const { insightsEnabled, hasApiKey, setInsightsEnabled, saveApiKey, clearApiKey } = useAiSettings();
  const { isPremium, setMockPremium, restorePurchases, requirePro } = usePremium();
  const { unit: glucoseUnit, setUnit: setGlucoseUnit, tabVisible, setTabVisible } = useGlucosePrefs();
  const { target, saveTarget } = useTarget();
  const [gluTargetDraft, setGluTargetDraft] = useState(String(target.glucoseMgdl));
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [protocolHidden, setProtocolHiddenState] = useState(false);
  const [widgetEnabled, setWidgetEnabledState] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminders, setReminders] = useState<ReminderSettings>({
    measurementEnabled: false,
    measurementHour: 8,
    medicationEnabled: false,
    medicationHours: [8, 20],
    glucoseEnabled: false,
    glucoseHour: 8,
  });

  useEffect(() => {
    getReminderSettings().then(setReminders).catch(() => {});
    isProtocolHidden().then(setProtocolHiddenState).catch(() => {});
    getWidgetEnabled().then(setWidgetEnabledState).catch(() => setWidgetEnabledState(false));
  }, []);

  useEffect(() => {
    setGluTargetDraft(String(target.glucoseMgdl));
  }, [target.glucoseMgdl]);

  const toggleHomeWidget = (value: boolean) => {
    if (value && !isPremium) {
      requirePro('homeWidget');
      return;
    }
    if (Platform.OS !== 'android') {
      Alert.alert(
        'Android only',
        'Home Screen widgets are available in the Android development or EAS build. Expo Go cannot run the widget. iOS widgets are not in this build.'
      );
      return;
    }
    if (!value) {
      void disableHomeWidget();
      setWidgetEnabledState(false);
      return;
    }
    Alert.alert(
      'Show latest reading on Home Screen?',
      'This sits on your Home Screen unencrypted so the launcher can display it. Notes, names, and your password never leave the vault. The widget clears when the app locks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Show numbers',
          onPress: async () => {
            await setWidgetEnabled(true);
            setWidgetEnabledState(true);
            await publishWidgetSnapshot(
              buildWidgetSnapshot({ enabled: true, locked: false, readings })
            );
            await pinHomeWidget();
          },
        },
      ]
    );
  };

  const persistProtocolVisible = async (show: boolean) => {
    await setProtocolHidden(!show);
    setProtocolHiddenState(!show);
  };

  const persistReminders = async (next: ReminderSettings) => {
    if (Platform.OS === 'web' && (next.measurementEnabled || next.medicationEnabled || next.glucoseEnabled)) {
      Alert.alert('Not available on web', 'Reminders are available in the Android and iOS apps.');
      return;
    }
    setReminderBusy(true);
    try {
      await saveReminderSettings(next);
      setReminders(next);
    } catch {
      Alert.alert('Permission needed', 'Enable notifications to set reminders.');
    } finally {
      setReminderBusy(false);
    }
  };

  const toggleBiometric = async (value: boolean) => {
    try {
      if (value) await enrollBiometric();
      else await removeBiometric();
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
      const visibleGlucose = isPremium ? glucose : getGlucoseReadingsForDays(glucose, 30);
      await shareCsvFile(readingsToCsv(readings), `bp_readings_${new Date().toISOString().split('T')[0]}.csv`);
      if (visibleGlucose.length > 0) {
        await shareCsvFile(
          glucoseToCsv(visibleGlucose, glucoseUnit),
          `glucose_${new Date().toISOString().split('T')[0]}.csv`
        );
      }
    } catch {
      Alert.alert('Export Failed', 'Unable to export the CSV file. Please try again.');
    }
  };

  const importCsv = async () => {
    try {
      const raw = await pickTextFile();
      const { readings: incoming, errors } = parseCsvReadings(raw);
      const unique = incoming.filter((reading) => !isDuplicateReading(readings, reading));
      if (incoming.length === 0) {
        Alert.alert('Import failed', errors[0] || 'No valid readings were found in that file.');
        return;
      }
      if (unique.length === 0) {
        Alert.alert('Nothing new', `All ${incoming.length} reading(s) are already in the app.`);
        return;
      }
      Alert.alert(
        'Import readings?',
        `Add ${unique.length} reading(s)${incoming.length !== unique.length ? ` (${incoming.length - unique.length} duplicate(s) skipped)` : ''}${errors.length ? `. ${errors.length} row(s) had errors and will be skipped.` : '.'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              try {
                for (const reading of unique) {
                  await addReading(reading);
                }
                await refresh();
                Alert.alert('Import complete', `Added ${unique.length} reading(s).`);
              } catch {
                Alert.alert('Import failed', 'Some readings could not be saved.');
              }
            },
          },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'No file selected') {
        Alert.alert('Import failed', 'Could not read that file. Use a CSV exported from BP Tracker.');
      }
    }
  };

  const exportPdf = async () => {
    if (!isPremium) {
      requirePro('pdfReport');
      return;
    }
    if (readings.length === 0) {
      Alert.alert('No Data', 'There are no readings to include in a report.');
      return;
    }
    try {
      await sharePdfReport(readings, { medications, glucose });
    } catch {
      Alert.alert('Report failed', 'Unable to create the PDF report.');
    }
  };

  const createBackup = async () => {
    if (!cryptoKey) {
      Alert.alert('Locked', 'Unlock the app before creating a backup.');
      return;
    }
    try {
      const backup = await createEncryptedBackup(cryptoKey as SessionCryptoKey, {
        readings,
        medications,
        glucose,
      });
      await shareBackupFile(backup);
    } catch {
      Alert.alert('Backup failed', 'Unable to create an encrypted backup.');
    }
  };

  const restoreBackup = async () => {
    if (!cryptoKey) {
      Alert.alert('Locked', 'Unlock the app before restoring a backup.');
      return;
    }
    try {
      const raw = await pickBackupFile();
      const parsed = JSON.parse(raw);
      if (!isEncryptedBackupFile(parsed)) {
        Alert.alert('Wrong file', 'That is not a BP Tracker encrypted backup.');
        return;
      }
      const data = await decryptBackup(cryptoKey as SessionCryptoKey, parsed);
      Alert.alert(
        'Replace current data?',
        `This will replace ${readings.length} BP reading(s), ${glucose.length} glucose reading(s), and ${medications.length} medication(s) with ${data.readings.length} BP, ${data.glucose.length} glucose, and ${data.medications.length} medication(s). This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: async () => {
              const key = cryptoKey as SessionCryptoKey;
              await readingsStore.clearAllReadings();
              await medsStore.clearAllMedications();
              await glucoseStore.clearAllGlucose();
              for (const reading of data.readings) {
                const { id: _id, createdAt: _c, updatedAt: _u, ...input } = reading;
                await readingsStore.addReading(input, key);
              }
              for (const med of data.medications) {
                const { id: _id, createdAt: _c, updatedAt: _u, ...input } = med;
                await medsStore.addMedication(input, key);
              }
              for (const row of data.glucose) {
                const { id: _id, createdAt: _c, updatedAt: _u, ...input } = row;
                await glucoseStore.addGlucose(input, key);
              }
              await refresh();
              await refreshMeds();
              await refreshGlucose();
              Alert.alert('Restore complete', 'Your encrypted backup has been restored on this device.');
            },
          },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not restore that file.';
      if (message !== 'No file selected') {
        Alert.alert('Restore failed', 'Wrong password/key or the backup file is damaged.');
      }
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data?',
      `This permanently deletes ${readings.length} BP reading(s), ${glucose.length} glucose reading(s), and ${medications.length} medication(s) on this device. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await readingsStore.clearAllReadings();
              await medsStore.clearAllMedications();
              await glucoseStore.clearAllGlucose();
              await refresh();
              await refreshMeds();
              await refreshGlucose();
              Alert.alert('Data Cleared', 'All readings and medications have been deleted.');
            } catch {
              Alert.alert('Error', 'Could not clear all data.');
            }
          },
        },
      ]
    );
  };

  const saveKey = async () => {
    await saveApiKey(apiKeyDraft);
    setApiKeyDraft('');
    Alert.alert('Saved', 'Your xAI API key is stored only on this device.');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
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
                <Text style={{ color: autoLockMinutes === mins ? colors.primaryForeground : colors.foreground, fontSize: 12 }}>
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
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(PRIVACY_URL)}>
          <Text style={{ color: colors.foreground }}>Privacy Policy</Text>
          <Feather name="external-link" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Home Screen</Text>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground, flex: 1, paddingRight: 12 }}>
            Show latest reading on widget
          </Text>
          <Switch
            value={isPremium && widgetEnabled}
            onValueChange={toggleHomeWidget}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Pro, Android, opt-in. Requires a development client or EAS APK — not Expo Go. Latest SYS/DIA
          and glucose (mg/dL) can sit on the launcher unencrypted; notes never leave the vault.
          Locking the app clears the numbers.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Logging</Text>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground, flex: 1, paddingRight: 12 }}>
            Measurement checklist
          </Text>
          <Switch
            value={!protocolHidden}
            onValueChange={persistProtocolVisible}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Free sit / feet / rest / cuff reminder on the Log screen. Preference stays on this device.
          Not a medical protocol.
        </Text>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground, flex: 1, paddingRight: 12 }}>
            Glucose display unit
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['mg/dL', 'mmol/L'] as const).map((u) => (
              <TouchableOpacity
                key={u}
                onPress={() => {
                  setGlucoseUnit(u).catch(() => {});
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: glucoseUnit === u ? colors.primary : colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: glucoseUnit === u ? colors.primaryForeground : colors.foreground, fontSize: 12 }}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Stored as mg/dL. This toggle only changes how numbers are shown. Not a medical device.
        </Text>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground, flex: 1, paddingRight: 12 }}>
            Show Glucose tab
          </Text>
          <Switch
            value={tabVisible}
            onValueChange={(value) => {
              setTabVisible(value).catch(() => {});
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Turn off to keep a 5-tab bar. You can still log glucose from the Log screen switcher.
        </Text>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={[styles.hint, { paddingHorizontal: 0, paddingBottom: 6 }]}>
            Personal glucose target (below, mg/dL)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
            value={gluTargetDraft}
            onChangeText={setGluTargetDraft}
            keyboardType="numeric"
            accessibilityLabel="Glucose personal target"
          />
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: colors.primary, marginTop: 10, alignSelf: 'flex-start' }]}
            onPress={async () => {
              const parsed = parseGlucoseTargetMgdl(gluTargetDraft);
              if (!parsed.ok) {
                Alert.alert('Invalid target', parsed.error);
                return;
              }
              await saveTarget({ ...target, glucoseMgdl: parsed.value });
            }}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Save glucose target</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Your own “below this” goal. Generic color bands stay educational and are not a diagnosis.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Grok AI insights</Text>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground, flex: 1, paddingRight: 12 }}>Opt-in after each log</Text>
          <Switch
            value={insightsEnabled}
            onValueChange={setInsightsEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Off by default. When enabled, only anonymized numbers and categories are sent to xAI with
          your own API key. Notes, dates, and identity never leave the device. Not medical advice.
        </Text>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
            value={apiKeyDraft}
            onChangeText={setApiKeyDraft}
            placeholder={hasApiKey ? 'Key saved on this device — paste to replace' : 'xAI API key'}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={saveKey}>
              <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Save key</Text>
            </TouchableOpacity>
            {hasApiKey ? (
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]} onPress={clearApiKey}>
                <Text style={{ color: colors.foreground }}>Remove key</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Reminders</Text>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Measurement reminder</Text>
          <Switch
            value={reminders.measurementEnabled}
            disabled={reminderBusy}
            onValueChange={(value) => persistReminders({ ...reminders, measurementEnabled: value })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Measurement time</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[7, 8, 9, 20].map((hour) => (
              <TouchableOpacity
                key={hour}
                onPress={() => persistReminders({ ...reminders, measurementHour: hour })}
                style={[
                  styles.chip,
                  {
                    backgroundColor: reminders.measurementHour === hour ? colors.primary : colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: reminders.measurementHour === hour ? colors.primaryForeground : colors.foreground, fontSize: 12 }}>
                  {hour}:00
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Medication reminder</Text>
          <Switch
            value={reminders.medicationEnabled}
            disabled={reminderBusy}
            onValueChange={(value) => persistReminders({ ...reminders, medicationEnabled: value })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground, flex: 1, paddingRight: 12 }}>
            Glucose reminder {isPremium ? '' : '(Pro)'}
          </Text>
          <Switch
            value={isPremium && reminders.glucoseEnabled}
            disabled={reminderBusy}
            onValueChange={(value) => {
              if (value && !isPremium) {
                requirePro('reminders');
                return;
              }
              persistReminders({ ...reminders, glucoseEnabled: value, glucoseHour: reminders.glucoseHour ?? 8 });
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Local notifications only. Medication alerts fire at 8:00 and 20:00.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>BP Tracker Pro</Text>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Status</Text>
          <Text style={{ color: isPremium ? colors.normal : colors.mutedForeground, fontWeight: '600' }}>
            {isPremium ? 'Pro (preview)' : 'Free'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground, flex: 1, paddingRight: 12 }}>
            Mock Pro (developer)
          </Text>
          <Switch
            value={isPremium}
            onValueChange={(value) => {
              setMockPremium(value).catch(() => {});
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <TouchableOpacity style={styles.row} onPress={() => restorePurchases()}>
          <Text style={{ color: colors.foreground }}>Restore purchases</Text>
          <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Entitlement is a local flag, not health data. Checkout is not connected yet.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Data</Text>
        <TouchableOpacity style={styles.row} onPress={createBackup}>
          <Text style={{ color: colors.foreground }}>Encrypted backup</Text>
          <Feather name="shield" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Encrypted with your master key. Keep the file private. Restore only works with the same password.
        </Text>
        <TouchableOpacity style={styles.row} onPress={restoreBackup}>
          <Text style={{ color: colors.foreground }}>Restore encrypted backup</Text>
          <Feather name="upload" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={exportPdf}>
          <Text style={{ color: colors.foreground }}>PDF report for clinician</Text>
          <Feather name="file-text" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={exportCsv}>
          <Text style={{ color: colors.foreground }}>Export readings (CSV)</Text>
          <Feather name="download" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={importCsv}>
          <Text style={{ color: colors.foreground }}>Import readings (CSV)</Text>
          <Feather name="upload" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          CSV and PDF are plaintext. Encrypted backup is the private option. Treat exported files as sensitive.
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
          <Text style={{ color: colors.mutedForeground }}>1.1.1</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground }}>Medical device?</Text>
          <Text style={{ color: colors.mutedForeground }}>No</Text>
        </View>
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Your data stays on your device unless you opt in to Grok insights or export a file.
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
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  hint: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 14,
    lineHeight: 18,
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
});
