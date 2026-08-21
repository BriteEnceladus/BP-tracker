import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PROTOCOL_HIDDEN_KEY,
  PROTOCOL_STEPS,
  parseProtocolHidden,
  isProtocolHidden,
  setProtocolHidden,
} from '../protocolHelper';

const { mockAsyncStorage } = vi.hoisted(() => ({
  mockAsyncStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
}));

describe('parseProtocolHidden', () => {
  it('treats missing or unknown values as visible (show helper)', () => {
    expect(parseProtocolHidden(null)).toBe(false);
    expect(parseProtocolHidden('')).toBe(false);
    expect(parseProtocolHidden('0')).toBe(false);
    expect(parseProtocolHidden('no')).toBe(false);
  });

  it('recognizes stored hide flags', () => {
    expect(parseProtocolHidden('1')).toBe(true);
    expect(parseProtocolHidden('true')).toBe(true);
  });
});

describe('PROTOCOL_STEPS', () => {
  it('covers sit, feet, rest, and cuff at heart', () => {
    const ids = PROTOCOL_STEPS.map((s) => s.id);
    expect(ids).toEqual(['sit', 'feet', 'rest', 'cuff']);
    expect(PROTOCOL_STEPS.some((s) => /5 minutes/i.test(s.label))).toBe(true);
    expect(PROTOCOL_STEPS.some((s) => /heart/i.test(s.label))).toBe(true);
  });
});

describe('protocol helper storage', () => {
  beforeEach(() => {
    mockAsyncStorage.getItem.mockReset();
    mockAsyncStorage.setItem.mockReset();
    mockAsyncStorage.removeItem.mockReset();
  });

  it('reads the hide preference from AsyncStorage', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('1');
    await expect(isProtocolHidden()).resolves.toBe(true);
    expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(PROTOCOL_HIDDEN_KEY);
  });

  it('persists hide and clears it when shown again', async () => {
    await setProtocolHidden(true);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(PROTOCOL_HIDDEN_KEY, '1');
    await setProtocolHidden(false);
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(PROTOCOL_HIDDEN_KEY);
  });

  it('fails open (show helper) if storage throws', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('unavailable'));
    await expect(isProtocolHidden()).resolves.toBe(false);
  });
});
