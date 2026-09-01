import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import Svg, { Line, Polyline, Circle } from 'react-native-svg';
import { useColors } from '../hooks/useColors';
import { BPReading } from '../src/db';
import { downsampleEven } from '../utils/chartDownsample';

interface BPChartProps {
  readings: BPReading[];
  height?: number;
  onPointPress?: (reading: BPReading) => void;
}

function BPChartInner({ readings, height = 220, onPointPress }: BPChartProps) {
  const colors = useColors();
  const { width: windowWidth } = useWindowDimensions();
  const width = windowWidth - 60;

  const sorted = useMemo(() => {
    if (readings.length < 2) return [];
    const chronological = [...readings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    return downsampleEven(chronological, 48);
  }, [readings]);

  const { maxValue, minValue } = useMemo(() => {
    if (sorted.length < 2) return { maxValue: 0, minValue: 0 };
    let maxSys = -Infinity;
    let minSys = Infinity;
    let maxDia = -Infinity;
    let minDia = Infinity;
    for (const r of sorted) {
      if (r.systolic > maxSys) maxSys = r.systolic;
      if (r.systolic < minSys) minSys = r.systolic;
      if (r.diastolic > maxDia) maxDia = r.diastolic;
      if (r.diastolic < minDia) minDia = r.diastolic;
    }
    return {
      maxValue: Math.max(maxSys, maxDia) + 10,
      minValue: Math.min(minSys, minDia) - 10,
    };
  }, [sorted]);

  if (sorted.length < 2) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={{ color: colors.mutedForeground }}>Not enough data for chart</Text>
      </View>
    );
  }

  const getX = (index: number) => (index / (sorted.length - 1)) * (width - 40) + 20;
  const getY = (value: number) => {
    return height - 40 - ((value - minValue) / (maxValue - minValue)) * (height - 70);
  };

  const sysPoints = sorted
    .map((r, i) => `${getX(i)},${getY(r.systolic)}`)
    .join(' ');

  const diaPoints = sorted
    .map((r, i) => `${getX(i)},${getY(r.diastolic)}`)
    .join(' ');

  return (
    <View style={[styles.container, { height, backgroundColor: colors.card }]}>
      <View style={{ position: 'relative' }}>
        <Svg width={width} height={height - 20}>
          {[0.25, 0.5, 0.75].map((p, idx) => {
            const y = 30 + p * (height - 70);
            return (
              <Line
                key={idx}
                x1="20"
                y1={y}
                x2={width - 20}
                y2={y}
                stroke={colors.border}
                strokeWidth="1"
              />
            );
          })}
          <Polyline
            points={sysPoints}
            fill="none"
            stroke={colors.crisis}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Polyline
            points={diaPoints}
            fill="none"
            stroke={colors.primary}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {sorted.map((r, i) => (
            <React.Fragment key={i}>
              <Circle cx={getX(i)} cy={getY(r.systolic)} r="4" fill={colors.crisis} />
              <Circle cx={getX(i)} cy={getY(r.diastolic)} r="4" fill={colors.primary} />
            </React.Fragment>
          ))}
        </Svg>
        {onPointPress && sorted.map((r, i) => {
          const x = getX(i) - 20;
          const ySys = getY(r.systolic) - 20;
          return (
            <TouchableOpacity
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: ySys,
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => onPointPress(r)}
            >
              <View style={{ width: 24, height: 24 }} />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.crisis }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Systolic</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Diastolic</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
});

export const BPChart = memo(BPChartInner);
