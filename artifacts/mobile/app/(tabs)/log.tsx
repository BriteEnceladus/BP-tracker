import React, { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import { BPReading } from '../../src/db';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function LogScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { readings, addReading, updateReading } = useBP();
  const params = useLocalSearchParams<{ id?: string }>();

  const editingReading = params.id
    ? readings.find((r) => r.id === Number(params.id))
    : null;

  const [systolic, setSystolic] = useState(editingReading?.systolic?.toString() || '');
  const [diastolic, setDiastolic] = useState(editingReading?.diastolic?.toString() || '');
  const [heartRate, setHeartRate] = useState(editingReading?.heartRate?.toString() || '');
  const [notes, setNotes] = useState(editingReading?.notes || '');
  const [medicationTaken, setMedicationTaken] = useState(
    editingReading?.medicationTaken || false
  );
  const [date, setDate] = useState(
    editingReading ? new Date(editingReading.timestamp) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isEditing = !!editingReading;

  const handleSave = async () => {
    const sysNum = parseInt(systolic, 10);
    const diaNum = parseInt(diastolic, 10);
    const hrNum = heartRate ? parseInt(heartRate, 10) : null;

    const errors: string[] = [];

    if (!systolic || isNaN(sysNum) || sysNum < 50 || sysNum > 300) {
      errors.push('Systolic must be between 50 and 300 mmHg');
    }
    if (!diastolic || isNaN(diaNum) || diaNum < 30 || diaNum > 200) {
      errors.push('Diastolic must be between 30 and 200 mmHg');
    }
    if (!isNaN(sysNum) && !isNaN(diaNum) && sysNum <= diaNum) {
      errors.push('Systolic should be higher than diastolic');
    }
    if (heartRate && (isNaN(hrNum!) || hrNum! < 30 || hrNum! > 250)) {
      errors.push('Heart rate must be between 30 and 250 bpm');
    }

    if (errors.length > 0) {
      Alert.alert('Invalid Input', errors.join('\n'));
      return;
    }

    const readingData: Omit<BPReading, 'id' | 'createdAt' | 'updatedAt'> = {
      timestamp: date.toISOString(),
      systolic: sysNum,
      diastolic: diaNum,
      heartRate: hrNum ?? undefined,
      notes: notes.trim() || undefined,
      medicationTaken,
    };

    try {
      if (isEditing && editingReading?.id) {
        await updateReading(editingReading.id, readingData);
      } else {
        await addReading(readingData);
      }
      // Prefer Home after save — better mobile flow than router.back() from tab
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      Alert.alert('Save Failed', 'Unable to save the reading. Please try again.');
    }
  };

  const inputStyle = {
    backgroundColor: colors.card,
    color: colors.foreground,
    borderColor: colors.border,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + 16,
            paddingBottom: 32 + insets.bottom,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isEditing ? 'Edit Reading' : 'Log Reading'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Sit quietly 5 minutes. Same arm each time.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Date & time</Text>
          <TouchableOpacity
            style={[styles.input, styles.touchField, inputStyle]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.foreground, fontSize: 17 }}>
              {date.toLocaleString()}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {/* BP side-by-side — easier one-handed phone entry */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.half]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Systolic *
            </Text>
            <TextInput
              style={[styles.input, styles.numberInput, inputStyle]}
              value={systolic}
              onChangeText={setSystolic}
              keyboardType="number-pad"
              placeholder="120"
              placeholderTextColor={colors.mutedForeground}
              maxLength={3}
              returnKeyType="next"
            />
            <Text style={[styles.unitHint, { color: colors.mutedForeground }]}>mmHg</Text>
          </View>
          <View style={[styles.inputGroup, styles.half]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Diastolic *
            </Text>
            <TextInput
              style={[styles.input, styles.numberInput, inputStyle]}
              value={diastolic}
              onChangeText={setDiastolic}
              keyboardType="number-pad"
              placeholder="80"
              placeholderTextColor={colors.mutedForeground}
              maxLength={3}
              returnKeyType="next"
            />
            <Text style={[styles.unitHint, { color: colors.mutedForeground }]}>mmHg</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Heart rate (bpm)
          </Text>
          <TextInput
            style={[styles.input, styles.numberInput, inputStyle]}
            value={heartRate}
            onChangeText={setHeartRate}
            keyboardType="number-pad"
            placeholder="72"
            placeholderTextColor={colors.mutedForeground}
            maxLength={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Notes (optional)
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, inputStyle]}
            value={notes}
            onChangeText={setNotes}
            placeholder="After coffee, morning, feeling…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={[styles.switchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.switchLabel, { color: colors.foreground }]}>
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
            {isEditing ? 'Update reading' : 'Save reading'}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 22,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 17,
  },
  touchField: {
    minHeight: 52,
    justifyContent: 'center',
  },
  numberInput: {
    minHeight: 56,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  unitHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: 'top',
    fontSize: 16,
    fontWeight: '400',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 56,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveText: {
    fontSize: 17,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 16,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
});
