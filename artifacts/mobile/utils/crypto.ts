/**
 * Shared crypto surface (platform resolved).
 * This file re-exports the common API so consumers do not need to know web vs native.
 *
 * Cryptographic key type:
 * - On web: native CryptoKey from the Web Crypto API
 * - On native: react-native-quick-crypto provides a compatible implementation
 *
 * We expose SessionCryptoKey as the canonical type for all session master keys.
 */

export type { EncryptedData, PasswordStrength } from './crypto.web';
export {
  getPasswordStrength,
  encryptData,
  decryptData,
  deriveKey,
  generateSalt,
  createVerifier,
  verifyKey,
} from './crypto.web';

export type SessionCryptoKey = CryptoKey;