import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import { getBPCategory, getCategoryColor, getCategoryLabel } from '../../utils/bpUtils';
import { useAiSettings } from '../../context/AiSettingsContext';
import { buildAnonymizedInsightPayload } from '../../utils/aiPayload';
import { fetchGrokInsight } from '../../utils/aiInsights';
import { AiInsightModal } from '../../components/AiInsightModal';
import { ProtocolHelper } from '../../components/ProtocolHelper';
import { GlucoseLogForm } from '../../components/GlucoseLogForm';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  BPReadingInputSchema,
  GlucoseReadingInputSchema,
  parseWithSchema,
  type GlucoseContextTag,
} from '../../src/schemas';
import { useGlucose } from '../../context/GlucoseContext';
import { useGlucosePrefs } from '../../context/GlucosePrefsContext';
import {
  GLUCOSE_CONTEXTS,
  GLUCOSE_DISCLAIMER,
  getGlucoseBand,
  getGlucoseBandColor,
  getGlucoseBandLabel,
  parseDisplayInput,
} from '../../utils/glucoseUtils';

export default function LogScreen() {
  const colors = useColors();
  const { readings, addReading, updateReading } = useBP();
  const { glucose, addGlucose } = useGlucose();
  const { unit } = useGlucosePrefs();
  const { insightsEnabled, hasApiKey, getApiKey } = useAiSettings();
  const [insightOpen, setInsightOpen] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightText, setInsightText] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const params = useLocalSearchParams<{ id?: string; metric?: string; gid?: string }>();
  const [metric, setMetric] = useState<'bp' | 'glucose'>(
    params.metric === 'glucose' || params.gid ? 'glucose' : 'bp'
  );

  const editingReading = params.id
    ? readings.find((r) => r.id === Number(params.id))
    : null;
  const editingGlucose = params.gid
    ? glucose.find((r) => r.id === Number(params.gid)) ?? null
    : null;

  const [systolic, setSystolic] = useState(editingReading?.systolic?.toString() || '');
  const [diastolic, setDiastolic] = useState(editingReading?.diastolic?.toString() || '');
  const [heartRate, setHeartRate] = useState(editingReading?.heartRate?.toString() || '');
  const [glucoseValue, setGlucoseValue] = useState('');
  const [glucoseContext, setGlucoseContext] = useState<GlucoseContextTag>('random');
  const [notes, setNotes] = useState(editingReading?.notes || '');
  const [medicationTaken, setMedicationTaken] = useState(editingReading?.medicationTaken || false);
  const [date, setDate] = useState(
    editingReading ? new Date(editingReading.timestamp) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isEditing = !!editingReading;

  // Live category preview
  const liveCategory = useMemo(() => {
    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);
    if (isNaN(sys) || isNaN(dia) || sys < 50 || dia < 30) return null;
    const key = getBPCategory(sys, dia);
    return {
      key,
      label: getCategoryLabel(key),
      color: getCategoryColor(key, colors),
    };
  }, [systolic, diastolic, colors]);

  const liveGlucoseBand = useMemo(() => {
    const mgdl = parseDisplayInput(glucoseValue, unit);
    if (mgdl == null) return null;
    const band = getGlucoseBand(mgdl);
    return {
      band,
      color: getGlucoseBandColor(band, colors),
      label: getGlucoseBandLabel(band),
    };
  }, [glucoseValue, unit, colors]);

  const parseCompanionGlucose = (timestamp: string) => {
    const raw = glucoseValue.trim();
    if (!raw) return { kind: 'skip' as const };
    const mgdl = parseDisplayInput(raw, unit);
    if (mgdl == null) {
      return {
        kind: 'error' as const,
        message: `Enter a valid glucose value in ${unit}, or leave it blank.`,
      };
    }
    const parsed = parseWithSchema(GlucoseReadingInputSchema, {
      timestamp,
      valueMgdl: mgdl,
      context: glucoseContext,
      notes: notes.trim() || undefined,
      medicationTaken,
    });
    if (!parsed.success) {
      return { kind: 'error' as const, message: parsed.errors.join('\n') };
    }
    return { kind: 'ok' as const, data: parsed.data };
  };

  const handleSave = async () => {
    const sysNum = parseInt(systolic, 10);
    const diaNum = parseInt(diastolic, 10);
    const hrNum = heartRate ? parseInt(heartRate, 10) : undefined;
    const timestamp = date.toISOString();
    const companion = parseCompanionGlucose(timestamp);

    if (companion.kind === 'error') {
      Alert.alert('Invalid glucose', companion.message);
      return;
    }

    const input = {
      timestamp,
      systolic: sysNum,
      diastolic: diaNum,
      heartRate: hrNum,
      notes: notes.trim() || undefined,
      medicationTaken,
    };

    const parsed = parseWithSchema(BPReadingInputSchema, input);

    if (!parsed.success) {
      Alert.alert('Invalid Input', parsed.errors.join('\n'));
      return;
    }

    const readingData = parsed.data;

    try {
      if (isEditing && editingReading?.id) {
        await updateReading(editingReading.id, readingData);
        if (companion.kind === 'ok') await addGlucose(companion.data);
        router.back();
        return;
      }

      await addReading(readingData);
      if (companion.kind === 'ok') await addGlucose(companion.data);

      if (insightsEnabled) {
        if (!hasApiKey) {
          Alert.alert(
            'Add an xAI API key',
            'Grok insights are on, but no API key is saved. Add one in Settings, or turn insights off.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }
        setInsightOpen(true);
        setInsightLoading(true);
        setInsightError(null);
        try {
          const key = await getApiKey();
          if (!key) throw new Error('Missing API key');
          const payload = buildAnonymizedInsightPayload(readingData, [...readings, { ...readingData, id: 0 }]);
          const text = await fetchGrokInsight(key, payload);
          setInsightText(text);
        } catch {
          setInsightError('Could not reach Grok. Your reading is saved on this device.');
        } finally {
          setInsightLoading(false);
        }
        return;
      }

      router.back();
    } catch {
      Alert.alert('Save Failed', 'Unable to save the reading. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.foreground }]}>
          {metric === 'glucose'
            ? editingGlucose
              ? 'Edit glucose'
              : 'Log glucose'
            : isEditing
              ? 'Edit Reading'
              : 'Log New Reading'}
        </Text>

        <View style={styles.metricRow}>
          {(['bp', 'glucose'] as const).map((m) => {
            const on = metric === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setMetric(m)}
                style={[
                  styles.metricChip,
                  {
                    backgroundColor: on ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: on ? colors.primaryForeground : colors.foreground, fontWeight: '600' }}>
                  {m === 'bp' ? 'Blood pressure' : 'Glucose'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {metric === 'glucose' ? <GlucoseLogForm editing={editingGlucose} /> : null}

        {metric === 'bp' ? <ProtocolHelper visible={!isEditing} /> : null}

        {metric === 'bp' && liveCategory && (
          <View style={[styles.categoryPreview, { backgroundColor: liveCategory.color + '18' }]}>
            <Text style={[styles.categoryLabel, { color: liveCategory.color }]}>
              {liveCategory.label}
            </Text>
          </View>
        )}

        {metric === 'bp' ? (
        <>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Date & Time</Text>
          <TouchableOpacity
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                justifyContent: 'center',
              },
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ color: colors.foreground, fontSize: 16 }}>
              {date.toLocaleString()}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Systolic *</Text>
            <TextInput
              style={[
                styles.input,
                styles.largeInput,
                { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
              ]}
              value={systolic}
              onChangeText={setSystolic}
              keyboardType="numeric"
              placeholder="120"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Diastolic *</Text>
            <TextInput
              style={[
                styles.input,
                styles.largeInput,
                { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
              ]}
              value={diastolic}
              onChangeText={setDiastolic}
              keyboardType="numeric"
              placeholder="80"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Heart Rate (bpm)</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
            ]}
            value={heartRate}
            onChangeText={setHeartRate}
            keyboardType="numeric"
            placeholder="72"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Glucose ({unit}) — optional
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
            ]}
            value={glucoseValue}
            onChangeText={setGlucoseValue}
            keyboardType="decimal-pad"
            placeholder={unit === 'mmol/L' ? '5.5' : '99'}
            placeholderTextColor={colors.mutedForeground}
          />
          {liveGlucoseBand ? (
            <View style={[styles.categoryPreview, { backgroundColor: liveGlucoseBand.color + '18', marginTop: 10, marginBottom: 0 }]}>
              <Text style={[styles.categoryLabel, { color: liveGlucoseBand.color }]}>
                {liveGlucoseBand.label}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Leave blank to skip. Saved as its own encrypted glucose log, not on the BP record.
          </Text>
          {glucoseValue.trim() ? (
            <>
              <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>
                Glucose category
              </Text>
              <View style={styles.chips}>
                {GLUCOSE_CONTEXTS.map((c) => {
                  const on = glucoseContext === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setGlucoseContext(c.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: on ? colors.primary : colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={{ color: on ? colors.primaryForeground : colors.foreground, fontSize: 13 }}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>{GLUCOSE_DISCLAIMER}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes (optional)</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="How are you feeling? Any symptoms?"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.mutedForeground, marginBottom: 0 }]}>
            Took medication?
          </Text>
          <Switch
            value={medicationTaken}
            onValueChange={setMedicationTaken}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
            {isEditing ? 'Update Reading' : 'Save Reading'}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={{ color: colors.mutedForeground }}>Cancel</Text>
          </TouchableOpacity>
        )}
        </>
        ) : null}
      </ScrollView>
      <AiInsightModal
        visible={insightOpen}
        loading={insightLoading}
        error={insightError}
        insight={insightText}
        onClose={() => {
          setInsightOpen(false);
          router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 16,
  },
  categoryPreview: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  largeInput: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  saveButton: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 17,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
