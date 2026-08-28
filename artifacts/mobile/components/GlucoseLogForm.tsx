import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useColors } from '../hooks/useColors';
import { useGlucose } from '../context/GlucoseContext';
import { useGlucosePrefs } from '../context/GlucosePrefsContext';
import { usePremium, FREE_HISTORY_DAYS } from '../context/PremiumContext';
import { useTarget } from '../context/TargetContext';
import { isGlucoseInTarget } from '../utils/targets';
import { GlucoseReadingInputSchema, parseWithSchema, type GlucoseContextTag, type GlucoseReading } from '../src/schemas';
import {
  GLUCOSE_CONTEXTS,
  GLUCOSE_DISCLAIMER,
  formatGlucoseValue,
  getGlucoseBand,
  getGlucoseBandColor,
  getGlucoseBandLabel,
  getGlucoseReadingsForDays,
  parseDisplayInput,
} from '../utils/glucoseUtils';
export function GlucoseLogForm({ editing }: { editing: GlucoseReading | null }) {
  const colors = useColors();
  const { glucose, addGlucose, updateGlucose } = useGlucose();
  const { isPremium } = usePremium();
  const { unit } = useGlucosePrefs();
  const { target } = useTarget();
  const visibleWindow = useMemo(
    () => getGlucoseReadingsForDays(glucose, isPremium ? 0 : FREE_HISTORY_DAYS),
    [glucose, isPremium]
  );
  const recentVisible = useMemo(
    () =>
      [...visibleWindow]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5),
    [visibleWindow]
  );
  const hiddenCount = isPremium ? 0 : Math.max(0, glucose.length - visibleWindow.length);
  const [value, setValue] = useState(
    editing ? formatGlucoseValue(editing.valueMgdl, unit) : ''
  );
  const [context, setContext] = useState<GlucoseContextTag>(editing?.context ?? 'random');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [medicationTaken, setMedicationTaken] = useState(editing?.medicationTaken || false);
  const [date, setDate] = useState(editing ? new Date(editing.timestamp) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (editing) setValue(formatGlucoseValue(editing.valueMgdl, unit));
  }, [editing, unit]);

  const liveBand = useMemo(() => {
    const mgdl = parseDisplayInput(value, unit);
    if (mgdl == null) return null;
    const band = getGlucoseBand(mgdl);
    const inTarget = isGlucoseInTarget(mgdl, target);
    return {
      band,
      color: getGlucoseBandColor(band, colors),
      label: `${getGlucoseBandLabel(band)}${inTarget ? ' \u00b7 Below your target' : ' \u00b7 Above your target'}`,
    };
  }, [value, unit, colors, target]);

  const handleSave = async () => {
    const mgdl = parseDisplayInput(value, unit);
    if (mgdl == null) {
      Alert.alert('Invalid Input', 'Enter a glucose value.');
      return;
    }
    const parsed = parseWithSchema(GlucoseReadingInputSchema, {
      timestamp: date.toISOString(),
      valueMgdl: mgdl,
      context,
      notes: notes.trim() || undefined,
      medicationTaken,
    });
    if (!parsed.success) {
      Alert.alert('Invalid Input', parsed.errors.join('\n'));
      return;
    }
    try {
      if (editing?.id != null) {
        await updateGlucose(editing.id, parsed.data);
      } else {
        await addGlucose(parsed.data);
      }
      router.back();
    } catch {
      Alert.alert('Save Failed', 'Unable to save the glucose reading. Please try again.');
    }
  };

  return (
    <View>
      <Text style={[styles.disclaimer, { color: colors.mutedForeground, borderColor: colors.border }]}>
        {GLUCOSE_DISCLAIMER} Generic color bands are educational reference ranges, not personal targets.
      </Text>

      {liveBand ? (
        <View style={[styles.preview, { backgroundColor: liveBand.color + '18' }]}>
          <Text style={[styles.previewText, { color: liveBand.color }]}>{liveBand.label}</Text>
        </View>
      ) : null}

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Date & Time</Text>
      <TouchableOpacity
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, justifyContent: 'center' }]}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={{ color: colors.foreground, fontSize: 16 }}>{date.toLocaleString()}</Text>
      </TouchableOpacity>
      {showDatePicker ? (
        <DateTimePicker
          value={date}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) setDate(selectedDate);
          }}
        />
      ) : null}

      <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>
        Glucose ({unit}) *
      </Text>
      <TextInput
        style={[
          styles.input,
          styles.largeInput,
          { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
        ]}
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        placeholder={unit === 'mmol/L' ? '5.5' : '99'}
        placeholderTextColor={colors.mutedForeground}
      />
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Stored as mg/dL. Change display unit in Settings — this does not rewrite past readings.
      </Text>

      <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>Context *</Text>
      <View style={styles.chips}>
        {GLUCOSE_CONTEXTS.map((c) => {
          const on = context === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => setContext(c.id)}
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

      <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>Notes (optional)</Text>
      <TextInput
        style={[
          styles.input,
          styles.textArea,
          { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
        ]}
        value={notes}
        onChangeText={setNotes}
        placeholder="How you feel, meal notes…"
        placeholderTextColor={colors.mutedForeground}
        multiline
      />

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

      <TouchableOpacity style={[styles.save, { backgroundColor: colors.primary }]} onPress={handleSave}>
        <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
          {editing ? 'Update glucose' : 'Save glucose'}
        </Text>
      </TouchableOpacity>

      {recentVisible.length > 0 ? (
        <View style={{ marginTop: 24 }}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            {isPremium ? 'Recent glucose' : `Last ${FREE_HISTORY_DAYS} days`}
          </Text>
          {!isPremium ? (
            <Text style={[styles.hint, { color: colors.mutedForeground, marginBottom: 8 }]}>
              {hiddenCount > 0
                ? `${hiddenCount} older reading(s) stay encrypted on this device and unlock with Pro.`
                : `Older logs stay on this device. Pro shows full history.`}
            </Text>
          ) : null}
          {recentVisible.map((row) => (
            <TouchableOpacity
              key={row.id ?? row.timestamp}
              onPress={() =>
                row.id != null &&
                router.push({ pathname: '/log', params: { metric: 'glucose', gid: String(row.id) } })
              }
              style={[styles.recentRow, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                {formatGlucoseValue(row.valueMgdl, unit)} {unit}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {new Date(row.timestamp).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  preview: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  previewText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 14, marginBottom: 6, fontWeight: '500' },
  hint: { fontSize: 12, marginTop: 6, lineHeight: 17 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  largeInput: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  save: { padding: 18, borderRadius: 14, alignItems: 'center' },
  saveText: { fontSize: 17, fontWeight: '600' },
  recentRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
});
