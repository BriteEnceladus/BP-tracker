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

export const GLUCOSE_TAB_VISIBLE_KEY = 'bp_glucose_tab_visible_v1';

export async function getGlucoseTabVisible(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(GLUCOSE_TAB_VISIBLE_KEY)) !== '0';
  } catch {
    return true;
  }
}

export async function setGlucoseTabVisible(visible: boolean): Promise<void> {
  if (visible) await AsyncStorage.removeItem(GLUCOSE_TAB_VISIBLE_KEY);
  else await AsyncStorage.setItem(GLUCOSE_TAB_VISIBLE_KEY, '0');
}
