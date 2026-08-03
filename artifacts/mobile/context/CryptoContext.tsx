/**
 * This file is intentionally left as a re-export so that TypeScript and
 * non-platform-aware imports continue to work.
 * Runtime resolution uses CryptoContext.native.tsx / CryptoContext.web.tsx.
 */
export { CryptoProvider, useCrypto } from './CryptoContext.native';
export type { CryptoContextType } from './CryptoContext.native';
