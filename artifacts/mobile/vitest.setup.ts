// vitest.setup.ts
// Runs before every test file.
// Provides Web Crypto API (subtle) for Node.js environment.

import { webcrypto } from 'node:crypto';

const g = globalThis as any;

if (!g.crypto) {
  g.crypto = webcrypto;
}

// Some libraries check for crypto.subtle directly
if (!g.crypto.subtle) {
  g.crypto.subtle = webcrypto.subtle;
}

console.log('[vitest] Web Crypto polyfill loaded');