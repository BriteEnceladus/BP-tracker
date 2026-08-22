import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Line, Polyline, Circle } from 'react-native-svg';
import { useColors } from '../hooks/useColors';
import { BPReading } from '../src/db';
import { downsampleEven } from '../utils/chartDownsample';

interface BPChartProps {
  readings: BPReading[];
  height?: number;
  onPointPress?: (reading: BPReading) => void;
}

export function BPChart({ readings, height = 220, onPointPress }: BPChartProps) {
  const colors = useColors();
  const width = Dimensions.get('window').width - 60;

  if (readings.length < 2) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={{ color: colors.mutedForeground }}>Not enough data for chart</Text>
      </View>
    );
  }

  const sorted = downsampleEven(
    [...readings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ),
    48
  );

  const maxSys = Math.max(...sorted.map(r => r.systolic));
  const minSys = Math.min(...sorted.map(r => r.systolic));
  const maxDia = Math.max(...sorted.map(r => r.diastolic));
  const minDia = Math.min(...sorted.map(r => r.diastolic));

  const maxValue = Math.max(maxSys, maxDia) + 10;
  const minValue = Math.min(minSys, minDia) - 10;

  const getX = (index: number) => (index / (sorted.length - 1)) * (width - 40) + 20;
  const getY = (value: number) => {
    return height - 40 - ((value - minValue) / (maxValue - minValue)) * (height - 70);
  };

  // Systolic line points
  const sysPoints = sorted
    .map((r, i) => `${getX(i)},${getY(r.systolic)}`)
    .join(' ');

  // Diastolic line points
  const diaPoints = sorted
    .map((r, i) => `${getX(i)},${getY(r.diastolic)}`)
    .join(' ');

  return (
    <View style={[styles.container, { height, backgroundColor: colors.card }]}>
      <View style={{ position: 'relative' }}>
        <Svg width={width} height={height - 20}>
          {/* Grid lines */}
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

          {/* Systolic line (red) */}
          <Polyline
            points={sysPoints}
            fill="none"
            stroke={colors.crisis}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Diastolic line (blue) */}
          <Polyline
            points={diaPoints}
            fill="none"
            stroke={colors.primary}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {sorted.map((r, i) => (
            <React.Fragment key={i}>
              <Circle cx={getX(i)} cy={getY(r.systolic)} r="4" fill={colors.crisis} />
              <Circle cx={getX(i)} cy={getY(r.diastolic)} r="4" fill={colors.primary} />
            </React.Fragment>
          ))}
        </Svg>

        {/* Tap areas for interactivity */}
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

      {/* Legend */}
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