/**
 * Puter cloud sync for BP Tracker.
 * - Web: loads js.puter.com directly
 * - Native (iOS/Android): Puter.js runs in a WebView bridge (PuterHost)
 */
import { Platform } from 'react-native';
import type { BPReading } from '../src/db';
import { bridgeCall, isBridgeHostReady } from './puterBridge';

export const PUTER_KV_KEY = 'bp-tracker:readings:v1';
export const PUTER_FILE_PATH = 'BP-Tracker/readings.json';
const PUTER_SCRIPT = 'https://js.puter.com/v2/';

export type PuterUserInfo = {
  username?: string;
  uuid?: string;
  email?: string;
};

type PuterLike = {
  auth: {
    isSignedIn: () => boolean;
    signIn: () => Promise<unknown>;
    signOut: () => Promise<void> | void;
    getUser: () => Promise<PuterUserInfo>;
  };
  kv: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: string) => Promise<unknown>;
  };
  fs: {
    mkdir: (path: string, opts?: { overwrite?: boolean }) => Promise<unknown>;
    write: (path: string, data: string) => Promise<unknown>;
    read: (path: string) => Promise<Blob>;
  };
};

declare global {
  // eslint-disable-next-line no-var
  var puter: PuterLike | undefined;
}

let loadPromise: Promise<PuterLike> | null = null;

function isWeb(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

/** Cloud available on web always; on native when PuterHost is mounted. */
export function isPuterAvailable(): boolean {
  if (isWeb()) return true;
  // Native: bridge host registers on mount — treat as available so UI shows Connect
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

async function ensurePuterWeb(): Promise<PuterLike> {
  if (globalThis.puter?.auth && globalThis.puter?.kv) {
    return globalThis.puter;
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${PUTER_SCRIPT}"]`
      );

      const onReady = () => {
        if (globalThis.puter?.auth && globalThis.puter?.kv) {
          resolve(globalThis.puter);
        } else {
          reject(new Error('Puter.js loaded but API is missing.'));
        }
      };

      if (existing) {
        if (globalThis.puter) onReady();
        else {
          existing.addEventListener('load', onReady, { once: true });
          existing.addEventListener(
            'error',
            () => reject(new Error('Failed to load Puter.js')),
            { once: true }
          );
        }
        return;
      }

      const script = document.createElement('script');
      script.src = PUTER_SCRIPT;
      script.async = true;
      script.onload = onReady;
      script.onerror = () => reject(new Error('Failed to load Puter.js'));
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}

export async function isSignedInToPuter(): Promise<boolean> {
  try {
    if (isWeb()) {
      const puter = await ensurePuterWeb();
      return !!puter.auth.isSignedIn();
    }
    const v = await bridgeCall('isSignedIn');
    return !!v;
  } catch {
    return false;
  }
}

export async function signInToPuter(): Promise<PuterUserInfo | null> {
  if (isWeb()) {
    const puter = await ensurePuterWeb();
    if (!puter.auth.isSignedIn()) {
      await puter.auth.signIn();
    }
    return getPuterUser();
  }
  // Native: interactive WebView modal for Puter login UI
  const user = (await bridgeCall('signIn', undefined, {
    interactive: true,
    timeoutMs: 180000,
  })) as PuterUserInfo | null;
  return user;
}

export async function signOutOfPuter(): Promise<void> {
  if (isWeb()) {
    const puter = await ensurePuterWeb();
    if (puter.auth.isSignedIn()) {
      await puter.auth.signOut();
    }
    return;
  }
  await bridgeCall('signOut');
}

export async function getPuterUser(): Promise<PuterUserInfo | null> {
  try {
    if (isWeb()) {
      const puter = await ensurePuterWeb();
      if (!puter.auth.isSignedIn()) return null;
      return await puter.auth.getUser();
    }
    return (await bridgeCall('getUser')) as PuterUserInfo | null;
  } catch {
    return null;
  }
}

function parseReadingsPayload(raw: unknown): BPReading[] | null {
  if (raw == null) return null;

  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (Array.isArray(value)) return value as BPReading[];
  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { readings?: unknown }).readings)
  ) {
    return (value as { readings: BPReading[] }).readings;
  }
  return null;
}

export async function loadCloudReadings(): Promise<BPReading[] | null> {
  if (!(await isSignedInToPuter())) return null;

  try {
    if (isWeb()) {
      const puter = await ensurePuterWeb();
      const fromKv = parseReadingsPayload(await puter.kv.get(PUTER_KV_KEY));
      if (fromKv) return fromKv;
      try {
        const blob = await puter.fs.read(PUTER_FILE_PATH);
        const text = await blob.text();
        return parseReadingsPayload(text);
      } catch {
        return [];
      }
    }

    const fromKv = parseReadingsPayload(
      await bridgeCall('kvGet', { key: PUTER_KV_KEY })
    );
    if (fromKv) return fromKv;
    try {
      const text = await bridgeCall('fsRead', { path: PUTER_FILE_PATH });
      return parseReadingsPayload(text);
    } catch {
      return [];
    }
  } catch (e) {
    console.warn('[puterCloud] load failed', e);
    throw e;
  }
}

export async function saveCloudReadings(readings: BPReading[]): Promise<void> {
  if (!(await isSignedInToPuter())) {
    throw new Error('Sign in to Puter to sync to the cloud.');
  }

  const payload = JSON.stringify({
    app: 'BP Tracker',
    version: 1,
    savedAt: new Date().toISOString(),
    readings,
  });

  if (isWeb()) {
    const puter = await ensurePuterWeb();
    await puter.kv.set(PUTER_KV_KEY, payload);
    try {
      await puter.fs.mkdir('BP-Tracker', { overwrite: false }).catch(() => {});
      await puter.fs.write(PUTER_FILE_PATH, payload);
    } catch (e) {
      console.warn('[puterCloud] file backup skipped', e);
    }
    return;
  }

  await bridgeCall('kvSet', { key: PUTER_KV_KEY, value: payload });
  try {
    await bridgeCall('fsWrite', {
      dir: 'BP-Tracker',
      path: PUTER_FILE_PATH,
      value: payload,
    });
  } catch (e) {
    console.warn('[puterCloud] native file backup skipped', e);
  }
}

export function mergeReadings(
  local: BPReading[],
  cloud: BPReading[]
): BPReading[] {
  const byKey = new Map<string, BPReading>();

  const fingerprint = (r: BPReading) =>
    r.id != null
      ? `id:${r.id}`
      : `fp:${r.timestamp}|${r.systolic}|${r.diastolic}|${r.heartRate ?? ''}|${r.notes ?? ''}`;

  const recency = (r: BPReading) => {
    const t =
      r.updatedAt || r.createdAt || r.timestamp || new Date(0).toISOString();
    return new Date(t).getTime();
  };

  const consider = (r: BPReading) => {
    const key = fingerprint(r);
    const existing = byKey.get(key);
    if (!existing || recency(r) >= recency(existing)) {
      byKey.set(key, r);
    }
  };

  local.forEach(consider);
  cloud.forEach(consider);

  const list = Array.from(byKey.values());
  const deduped = new Map<string, BPReading>();
  for (const r of list) {
    const softKey = `${r.timestamp}|${r.systolic}|${r.diastolic}|${r.heartRate ?? ''}`;
    const existing = deduped.get(softKey);
    if (!existing || recency(r) >= recency(existing)) {
      deduped.set(softKey, r);
    }
  }

  return Array.from(deduped.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getBridgeDebugStatus() {
  return {
    platform: Platform.OS,
    bridgeReady: isBridgeHostReady(),
  };
}
