import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useColors';
import type { GlucoseInsightCard as Card } from '../utils/glucoseInsights';

function GlucoseInsightCardInner({ card }: { card: Card }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{card.title}</Text>
      {card.bullets.map((line) => (
        <Text key={line} style={[styles.bullet, { color: colors.mutedForeground }]}>
          • {line}
        </Text>
      ))}
      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>{card.disclaimer}</Text>
    </View>
  );
}

export const GlucoseInsightCard = memo(GlucoseInsightCardInner);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
});
