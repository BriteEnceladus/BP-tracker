import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Polyline, Circle } from 'react-native-svg';
import { useColors } from '../hooks/useColors';
import type { GlucoseDisplayUnit, GlucoseReading } from '../src/schemas';
import { formatGlucoseValue } from '../utils/glucoseUtils';
import { downsampleEven } from '../utils/chartDownsample';

function GlucoseChartInner({
  readings,
  unit,
  height = 220,
}: {
  readings: GlucoseReading[];
  unit: GlucoseDisplayUnit;
  height?: number;
}) {
  const colors = useColors();
  const width = Dimensions.get('window').width - 60;

  if (readings.length < 2) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={{ color: colors.mutedForeground }}>Not enough data for chart</Text>
      </View>
    );
  }

  const sorted = useMemo(() => {
    const chronological = [...readings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    return downsampleEven(chronological, 48);
  }, [readings]);
  const values = sorted.map((r) => r.valueMgdl);
  const maxValue = Math.max(...values) + 10;
  const minValue = Math.max(0, Math.min(...values) - 10);
  const getX = (index: number) => (index / (sorted.length - 1)) * (width - 40) + 20;
  const getY = (value: number) =>
    height - 40 - ((value - minValue) / Math.max(1, maxValue - minValue)) * (height - 70);
  const points = sorted.map((r, i) => `${getX(i)},${getY(r.valueMgdl)}`).join(' ');

  return (
    <View style={[styles.container, { height, backgroundColor: colors.card }]}>
      <Text style={[styles.caption, { color: colors.mutedForeground }]}>
        {formatGlucoseValue(minValue, unit)} – {formatGlucoseValue(maxValue, unit)} {unit}
      </Text>
      <Svg width={width} height={height - 20}>
        {[0.25, 0.5, 0.75].map((p) => {
          const y = 30 + p * (height - 70);
          return (
            <Line
              key={p}
              x1={20}
              y1={y}
              x2={width - 20}
              y2={y}
              stroke={colors.border}
              strokeDasharray="4 6"
            />
          );
        })}
        <Polyline points={points} fill="none" stroke={colors.accent} strokeWidth={2.5} />
        {sorted.map((r, i) => (
          <Circle key={r.id ?? i} cx={getX(i)} cy={getY(r.valueMgdl)} r={4} fill={colors.accent} />
        ))}
      </Svg>
    </View>
  );
}

export const GlucoseChart = memo(GlucoseChartInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caption: {
    fontSize: 11,
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginBottom: 4,
  },
});
