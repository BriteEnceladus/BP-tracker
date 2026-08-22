import type { GlucoseReading, GlucoseReadingInput } from '../src/schemas';
import { encryptData, decryptData, type EncryptedData, type SessionCryptoKey } from './crypto';

export type EncryptedGlucosePayload = EncryptedData;
export type { SessionCryptoKey };

export async function encryptGlucose(
  reading: GlucoseReading | GlucoseReadingInput,
  key: SessionCryptoKey
): Promise<EncryptedGlucosePayload> {
  return encryptData(key, JSON.stringify(reading));
}

export async function decryptGlucose(
  payload: EncryptedGlucosePayload,
  key: SessionCryptoKey
): Promise<GlucoseReading> {
  const plaintext = await decryptData(key, payload);
  const parsed = JSON.parse(plaintext);
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !parsed.timestamp ||
    typeof parsed.valueMgdl !== 'number'
  ) {
    throw new Error('Decrypted data is not a valid glucose reading');
  }
  return parsed as GlucoseReading;
}
