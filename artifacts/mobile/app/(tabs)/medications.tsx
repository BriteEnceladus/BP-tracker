import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { useMeds } from '../../context/MedsContext';
import { Medication } from '../../src/db';

export default function MedicationsScreen() {
  const colors = useColors();
  const {
    medications,
    isLoading,
    addMedication,
    updateMedication,
    deleteMedication,
    toggleActive,
  } = useMeds();

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const filtered = useMemo(() => {
    if (!search.trim()) return medications;
    const q = search.toLowerCase();
    return medications.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.dosage.toLowerCase().includes(q) ||
        m.frequency.toLowerCase().includes(q)
    );
  }, [medications, search]);

  const openAdd = () => {
    setEditingMed(null);
    setName('');
    setDosage('');
    setFrequency('Once daily');
    setNotes('');
    setIsActive(true);
    setModalVisible(true);
  };

  const openEdit = (med: Medication) => {
    setEditingMed(med);
    setName(med.name);
    setDosage(med.dosage);
    setFrequency(med.frequency);
    setNotes(med.notes || '');
    setIsActive(med.isActive);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim()) {
      Alert.alert('Missing fields', 'Name and dosage are required.');
      return;
    }

    try {
      if (editingMed?.id) {
        await updateMedication(editingMed.id, {
          name: name.trim(),
          dosage: dosage.trim(),
          frequency: frequency.trim() || 'Once daily',
          notes: notes.trim() || undefined,
          isActive,
        });
      } else {
        await addMedication({
          name: name.trim(),
          dosage: dosage.trim(),
          frequency: frequency.trim() || 'Once daily',
          notes: notes.trim() || undefined,
          isActive,
        });
      }
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Could not save medication.');
    }
  };

  const handleDelete = (med: Medication) => {
    Alert.alert(
      'Delete Medication?',
      `Remove "${med.name}" permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (med.id) await deleteMedication(med.id);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Medication }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => openEdit(item)}
      activeOpacity={0.75}
    >
      {/* Left accent bar */}
      <View
        style={[
          styles.accent,
          { backgroundColor: item.isActive ? colors.normal : colors.mutedForeground },
        ]}
      />

      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={[styles.medName, { color: colors.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: item.isActive
                  ? colors.normal + '22'
                  : colors.mutedForeground + '22',
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: item.isActive ? colors.normal : colors.mutedForeground },
              ]}
            >
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <Text style={[styles.dosage, { color: colors.mutedForeground }]}>
          {item.dosage} · {item.frequency}
        </Text>

        {item.notes ? (
          <Text style={[styles.notes, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => item.id && toggleActive(item.id)}
        style={styles.toggleBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather
          name={item.isActive ? 'check-circle' : 'circle'}
          size={22}
          color={item.isActive ? colors.normal : colors.mutedForeground}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Loading medications...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Medications</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={openAdd}
        >
          <Feather name="plus" size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search medications..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="package" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {search ? 'No matches' : 'No medications yet'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {search
              ? 'Try a different search term'
              : 'Add your first medication to start tracking'}
          </Text>
          {!search && (
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={openAdd}
            >
              <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>
                Add Medication
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id?.toString() || item.name}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: colors.background }}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingMed ? 'Edit Medication' : 'Add Medication'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Amlodipine"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Dosage *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                value={dosage}
                onChangeText={setDosage}
                placeholder="e.g. 5 mg"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Frequency</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                value={frequency}
                onChangeText={setFrequency}
                placeholder="Once daily"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.label, { color: colors.mutedForeground, marginBottom: 0 }]}>
                Active
              </Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {editingMed && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  setModalVisible(false);
                  handleDelete(editingMed);
                }}
              >
                <Text style={{ color: colors.crisis, fontWeight: '600' }}>Delete Medication</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  accent: {
    width: 5,
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  medName: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dosage: {
    fontSize: 14,
  },
  notes: {
    fontSize: 13,
    marginTop: 4,
  },
  toggleBtn: {
    padding: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  deleteBtn: {
    alignItems: 'center',
    padding: 16,
    marginTop: 12,
  },
});
