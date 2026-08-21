import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import {
  PROTOCOL_STEPS,
  isProtocolHidden,
  setProtocolHidden,
  type ProtocolStepId,
} from '../utils/protocolHelper';

type Props = {
  /** Hide on edit so the checklist only appears for a new log. */
  visible: boolean;
};

export function ProtocolHelper({ visible }: Props) {
  const colors = useColors();
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const [checked, setChecked] = useState<Record<ProtocolStepId, boolean>>({
    sit: false,
    feet: false,
    rest: false,
    cuff: false,
  });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      isProtocolHidden()
        .then((value) => {
          if (!cancelled) {
            setHidden(value);
            setReady(true);
          }
        })
        .catch(() => {
          if (!cancelled) setReady(true);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const toggleStep = (id: ProtocolStepId) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const hideForever = async () => {
    await setProtocolHidden(true);
    setHidden(true);
  };

  if (!visible || !ready || hidden || sessionDismissed) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Before you measure</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        A short local checklist. It does not change your reading and is not a medical protocol.
      </Text>

      {PROTOCOL_STEPS.map((step) => {
        const on = checked[step.id];
        return (
          <TouchableOpacity
            key={step.id}
            style={styles.stepRow}
            onPress={() => toggleStep(step.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={step.label}
          >
            <Feather
              name={on ? 'check-circle' : 'circle'}
              size={20}
              color={on ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.stepLabel, { color: colors.foreground }]}>{step.label}</Text>
          </TouchableOpacity>
        );
      })}

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => setSessionDismissed(true)} accessibilityRole="button">
          <Text style={{ color: colors.mutedForeground, fontWeight: '500' }}>Hide for now</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={hideForever} accessibilityRole="button">
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Don’t show again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  stepLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
