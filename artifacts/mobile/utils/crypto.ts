/**
 * Shared crypto utilities.
 * On web, platform resolution prefers crypto.web.ts for the full Web Crypto implementation.
 * This file provides the common exports (especially getPasswordStrength) so imports resolve on native.
 */
export type { EncryptedData, PasswordStrength } from './crypto.web';

// Re-export the password strength helper (pure JS, safe on all platforms)
export { getPasswordStrength } from './crypto.web';

// Note: Full AES-GCM / PBKDF2 helpers live in crypto.web.ts and are web-only.
// Native encryption path (expo-crypto + SecureStore) will be added in a follow-up.
