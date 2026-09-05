/**
 * Must load before expo-router/entry so QuickCrypto wins over the Hermes
 * getRandomValues-only stub. Play 1.1.1 never called install().
 */
import QuickCrypto from 'react-native-quick-crypto';

type Qc = {
  install?: () => void;
  getRandomValues?: (arr: Uint8Array) => Uint8Array;
  subtle?: object;
  webcrypto?: Qc;
};

try {
  const qc = QuickCrypto as unknown as Qc;
  qc.install?.();
  const surface = (qc.subtle ? qc : qc.webcrypto) ?? qc;
  const g = global as unknown as { crypto?: Qc };
  if (surface?.subtle) {
    g.crypto = {
      ...(g.crypto ?? {}),
      ...surface,
      subtle: surface.subtle,
      getRandomValues:
        surface.getRandomValues?.bind(surface) ??
        g.crypto?.getRandomValues,
    };
  }
} catch {
  // crypto.native.ts surfaces a user-facing error if subtle is still missing.
}
