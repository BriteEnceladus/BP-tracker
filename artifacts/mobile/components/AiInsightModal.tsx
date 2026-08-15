import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useColors } from '../hooks/useColors';

interface AiInsightModalProps {
  visible: boolean;
  loading: boolean;
  error?: string | null;
  insight?: string | null;
  onClose: () => void;
}

export function AiInsightModal({ visible, loading, error, insight, onClose }: AiInsightModalProps) {
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Grok insight</Text>
          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
            Optional, opt-in only. A small anonymized summary (numbers and categories, no notes or
            dates) is sent to xAI with your own API key. This is not medical advice.
          </Text>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Asking Grok…</Text>
            </View>
          ) : error ? (
            <Text style={{ color: colors.crisis, lineHeight: 20 }}>{error}</Text>
          ) : (
            <ScrollView style={{ maxHeight: 280 }}>
              <Text style={[styles.body, { color: colors.foreground }]}>{insight}</Text>
            </ScrollView>
          )}
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onClose}>
            <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '700' },
  disclaimer: { fontSize: 12, lineHeight: 18 },
  body: { fontSize: 15, lineHeight: 22 },
  center: { alignItems: 'center', paddingVertical: 20 },
  button: { marginTop: 8, padding: 14, borderRadius: 12, alignItems: 'center' },
});
