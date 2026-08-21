import AsyncStorage from '@react-native-async-storage/async-storage';

/** Preference only — never stores readings, notes, or identity. */
export const PROTOCOL_HIDDEN_KEY = 'bp_protocol_helper_hidden_v1';

export const PROTOCOL_STEPS = [
  { id: 'sit', label: 'Sit comfortably, back supported' },
  { id: 'feet', label: 'Feet flat on the floor' },
  { id: 'rest', label: 'Rest quietly for about 5 minutes' },
  { id: 'cuff', label: 'Cuff at heart level, arm relaxed' },
] as const;

export type ProtocolStepId = (typeof PROTOCOL_STEPS)[number]['id'];

export function parseProtocolHidden(raw: string | null): boolean {
  return raw === '1' || raw === 'true';
}

export async function isProtocolHidden(): Promise<boolean> {
  try {
    return parseProtocolHidden(await AsyncStorage.getItem(PROTOCOL_HIDDEN_KEY));
  } catch {
    return false;
  }
}

export async function setProtocolHidden(hidden: boolean): Promise<void> {
  if (hidden) {
    await AsyncStorage.setItem(PROTOCOL_HIDDEN_KEY, '1');
  } else {
    await AsyncStorage.removeItem(PROTOCOL_HIDDEN_KEY);
  }
}
