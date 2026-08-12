/**
 * Shared crypto surface.
 * Platform resolution will pick crypto.web.ts or crypto.native.ts for the heavy lifting.
 * This file exists so imports of getPasswordStrength always resolve.
 */
export type { EncryptedData, PasswordStrength } from './crypto.web';

// getPasswordStrength is pure JS and identical on both platforms
export { getPasswordStrength } from './crypto.web';
