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
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import { BPReading } from '../../src/db';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function LogScreen() {
  const colors = useColors();
  const { readings, addReading, updateReading } = useBP();
  const params = useLocalSearchParams<{ id?: string }>();

  const editingReading = params.id 
    ? readings.find(r => r.id === Number(params.id)) 
    : null;

  const [systolic, setSystolic] = useState(editingReading?.systolic?.toString() || '');
  const [diastolic, setDiastolic] = useState(editingReading?.diastolic?.toString() || '');
  const [heartRate, setHeartRate] = useState(editingReading?.heartRate?.toString() || '');
  const [notes, setNotes] = useState(editingReading?.notes || '');
  const [medicationTaken, setMedicationTaken] = useState(editingReading?.medicationTaken || false);
  const [date, setDate] = useState(
    editingReading ? new Date(editingReading.timestamp) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isEditing = !!editingReading;

  const handleSave = async () => {
    const sysNum = parseInt(systolic);
    const diaNum = parseInt(diastolic);
    const hrNum = heartRate ? parseInt(heartRate) : null;

    const errors: string[] = [];

    if (!systolic || isNaN(sysNum) || sysNum < 50 || sysNum > 300) {
      errors.push('Systolic must be a number between 50 and 300 mmHg');
    }
    if (!diastolic || isNaN(diaNum) || diaNum < 30 || diaNum > 200) {
      errors.push('Diastolic must be a number between 30 and 200 mmHg');
    }
    if (heartRate && (isNaN(hrNum!) || hrNum! < 30 || hrNum! > 250)) {
      errors.push('Heart rate must be between 30 and 250 bpm if provided');
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
      if (isEditing && editingReading.id) {
        await updateReading(editingReading.id, readingData);
      } else {
        await addReading(readingData);
      }
      router.back();
    } catch (error) {
      Alert.alert('Save Failed', 'Unable to save the reading. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isEditing ? 'Edit Reading' : 'Log New Reading'}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Date & Time</Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, justifyContent: 'center' }]}
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
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Systolic (mmHg) *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={systolic}
            onChangeText={setSystolic}
            keyboardType="numeric"
            placeholder="120"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Diastolic (mmHg) *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={diastolic}
            onChangeText={setDiastolic}
            keyboardType="numeric"
            placeholder="80"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Heart Rate (bpm)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={heartRate}
            onChangeText={setHeartRate}
            keyboardType="numeric"
            placeholder="72"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="How are you feeling?"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Took medication?</Text>
          <Switch
            value={medicationTaken}
            onValueChange={setMedicationTaken}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: colors.primary }]} 
          onPress={handleSave}
        >
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
            {isEditing ? 'Update Reading' : 'Save Reading'}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={{ color: colors.mutedForeground }}>Cancel</Text>
          </Text>
        </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
    alignItems: 'center',
  },
});