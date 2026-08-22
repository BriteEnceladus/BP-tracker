import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GlucoseDisplayUnit } from '../src/schemas';

export const GLUCOSE_UNIT_KEY = 'bp_glucose_display_unit_v1';

export function parseGlucoseDisplayUnit(raw: string | null): GlucoseDisplayUnit {
  return raw === 'mmol/L' ? 'mmol/L' : 'mg/dL';
}

export async function getGlucoseDisplayUnit(): Promise<GlucoseDisplayUnit> {
  try {
    return parseGlucoseDisplayUnit(await AsyncStorage.getItem(GLUCOSE_UNIT_KEY));
  } catch {
    return 'mg/dL';
  }
}

export async function setGlucoseDisplayUnit(unit: GlucoseDisplayUnit): Promise<void> {
  await AsyncStorage.setItem(GLUCOSE_UNIT_KEY, unit);
}
