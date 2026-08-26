import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { useMeds } from '../../context/MedsContext';
import { useBP } from '../../context/BPContext';
import { usePremium, FREE_HISTORY_DAYS } from '../../context/PremiumContext';
import { MedsVsBpCard } from '../../components/MedsVsBpCard';
import { summarizeMedsVsBp } from '../../utils/medAdherence';
import { getReadingsForDays } from '../../utils/bpUtils';
import { Medication, MedicationInput, parseWithSchema, MedicationInputSchema } from '../../src/schemas';

export default function MedicationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { medications, isLoading, addMedication, updateMedication, deleteMedication, toggleActive } =
    useMeds();
  const { readings } = useBP();
  const { isPremium, requirePro } = usePremium();
  const medsVsBp = useMemo(() => {
    const windowed = getReadingsForDays(readings, isPremium ? 0 : FREE_HISTORY_DAYS);
    return summarizeMedsVsBp(windowed);
  }, [readings, isPremium]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);

  // Form state — real controlled inputs, no placeholders as values
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setDosage('');
    setFrequency('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setActive(true);
    setFormError('');
    setModalVisible(true);
  };

  const openEdit = (med: Medication) => {
    setEditing(med);
    setName(med.name);
    setDosage(med.dosage);
    setFrequency(med.frequency);
    setStartDate(med.startDate || '');
    setNotes(med.notes || '');
    setActive(med.active);
    setFormError('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    setFormError('');
    const input: MedicationInput = {
      name: name.trim(),
      dosage: dosage.trim(),
      frequency: frequency.trim(),
      startDate: startDate.trim() || undefined,
      notes: notes.trim() || undefined,
      active,
    };

    const parsed = parseWithSchema(MedicationInputSchema, input);
    if (!parsed.success) {
      setFormError(parsed.errors[0] || 'Invalid input');
      return;
    }

    setSaving(true);
    try {
      if (editing?.id != null) {
        await updateMedication(editing.id, parsed.data);
      } else {
        await addMedication({ ...parsed.data, active: parsed.data.active ?? true });
      }
      setModalVisible(false);
    } catch (e) {
      setFormError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (med: Medication) => {
    Alert.alert(
      'Delete medication?',
      `Remove "${med.name}" permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => med.id != null && deleteMedication(med.id),
        },
      ]
    );
  };

  const activeMeds = medications.filter((m) => m.active);
  const inactiveMeds = medications.filter((m) => !m.active);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Medications</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={openAdd}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={20} color={colors.primaryForeground || '#fff'} />
          <Text style={[styles.addBtnText, { color: colors.primaryForeground || '#fff' }]}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
        For personal tracking only. Not medical advice. Always follow your clinician’s instructions.
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {readings.length > 0 ? (
          <View style={{ marginBottom: 16 }}>
            <MedsVsBpCard
              summary={medsVsBp}
              isPremium={isPremium}
              activeMedCount={activeMeds.length}
              onPressPro={() => requirePro('medsCorrelation')}
            />
          </View>
        ) : null}
        {isLoading ? (
          <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 40 }}>
            Loading…
          </Text>
        ) : medications.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="package" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No medications yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Tap Add to record a medication you take.
            </Text>
          </View>
        ) : (
          <>
            {activeMeds.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Active</Text>
            )}
            {activeMeds.map((med) => (
              <MedCard
                key={med.id}
                med={med}
                colors={colors}
                onEdit={() => openEdit(med)}
                onToggle={() => med.id != null && toggleActive(med.id)}
                onDelete={() => confirmDelete(med)}
              />
            ))}

            {inactiveMeds.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>
                Inactive
              </Text>
            )}
            {inactiveMeds.map((med) => (
              <MedCard
                key={med.id}
                med={med}
                colors={colors}
                onEdit={() => openEdit(med)}
                onToggle={() => med.id != null && toggleActive(med.id)}
                onDelete={() => confirmDelete(med)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Add / Edit Modal — real inputs */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editing ? 'Edit Medication' : 'Add Medication'}
            </Text>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Name *</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Lisinopril"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Dosage *</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={dosage}
              onChangeText={setDosage}
              placeholder="e.g. 10 mg"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Frequency *</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={frequency}
              onChangeText={setFrequency}
              placeholder="e.g. Once daily"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Start date</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes"
              placeholderTextColor={colors.mutedForeground}
              multiline
            />

            <View style={styles.switchRow}>
              <Text style={{ color: colors.foreground }}>Active</Text>
              <Switch
                value={active}
                onValueChange={setActive}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {formError ? (
              <Text style={{ color: colors.crisis || '#EF4444', marginBottom: 8 }}>{formError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: colors.mutedForeground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={{ color: colors.primaryForeground || '#fff', fontWeight: '600' }}>
                  {saving ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function MedCard({
  med,
  colors,
  onEdit,
  onToggle,
  onDelete,
}: {
  med: Medication;
  colors: ReturnType<typeof useColors>;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.medName, { color: colors.foreground }]}>{med.name}</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 2 }}>
          {med.dosage} · {med.frequency}
        </Text>
        {med.notes ? (
          <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 13 }} numberOfLines={2}>
            {med.notes}
          </Text>
        ) : null}
      </View>
      <View style={styles.cardActions}>
        <Switch
          value={med.active}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
        <TouchableOpacity onPress={onEdit} hitSlop={10} style={{ padding: 6 }}>
          <Feather name="edit-2" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={10} style={{ padding: 6 }}>
          <Feather name="trash-2" size={18} color={colors.crisis || '#EF4444'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: { fontWeight: '600', fontSize: 15 },
  disclaimer: { fontSize: 12, marginBottom: 16, lineHeight: 17 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySub: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  medName: { fontSize: 16, fontWeight: '600' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 16,
  },
  notesInput: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
