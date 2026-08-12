/**
 * Native ↔ Puter.js RPC bridge (WebView).
 * The actual Puter SDK runs inside a WebView; this module queues calls
 * until the host is ready and resolves responses by request id.
 */

export type PuterBridgeRequest = {
  id: string;
  action: 'signIn' | 'signOut' | 'isSignedIn' | 'getUser' | 'kvGet' | 'kvSet' | 'fsWrite' | 'fsRead';
  payload?: Record<string, unknown>;
};

export type PuterBridgeResponse = {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type Host = {
  send: (req: PuterBridgeRequest) => void;
  /** When true, sign-in should present the WebView interactively. */
  setInteractive: (on: boolean) => void;
};

let host: Host | null = null;
let ready = false;
const pending = new Map<string, Pending>();
const readyWaiters: Array<() => void> = [];

function uid() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function isBridgeHostReady() {
  return ready && !!host;
}

export function registerPuterBridgeHost(next: Host | null) {
  host = next;
  if (!next) {
    ready = false;
  }
}

export function markPuterBridgeReady() {
  ready = true;
  while (readyWaiters.length) {
    const w = readyWaiters.shift();
    w?.();
  }
}

export function handlePuterBridgeMessage(raw: string) {
  let msg: PuterBridgeResponse | { type: string };
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  if ((msg as { type?: string }).type === 'ready') {
    markPuterBridgeReady();
    return;
  }

  const res = msg as PuterBridgeResponse;
  if (!res?.id) return;
  const p = pending.get(res.id);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(res.id);
  if (res.ok) p.resolve(res.data);
  else p.reject(new Error(res.error || 'Puter bridge error'));
}

async function waitUntilReady(timeoutMs = 20000) {
  if (ready && host) return;
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error('Puter cloud bridge timed out loading. Check network and try again.'));
    }, timeoutMs);
    readyWaiters.push(() => {
      clearTimeout(t);
      resolve();
    });
  });
}

export async function bridgeCall(
  action: PuterBridgeRequest['action'],
  payload?: Record<string, unknown>,
  opts?: { interactive?: boolean; timeoutMs?: number }
): Promise<unknown> {
  await waitUntilReady(opts?.timeoutMs ?? 20000);
  if (!host) throw new Error('Puter bridge is not mounted.');

  if (opts?.interactive) {
    host.setInteractive(true);
  }

  const id = uid();
  const req: PuterBridgeRequest = { id, action, payload };

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      if (opts?.interactive) host?.setInteractive(false);
      reject(new Error(`Puter ${action} timed out`));
    }, opts?.timeoutMs ?? (opts?.interactive ? 180000 : 30000));

    pending.set(id, {
      resolve: (v) => {
        if (opts?.interactive) host?.setInteractive(false);
        resolve(v);
      },
      reject: (e) => {
        if (opts?.interactive) host?.setInteractive(false);
        reject(e);
      },
      timer,
    });

    try {
      host!.send(req);
    } catch (e: any) {
      clearTimeout(timer);
      pending.delete(id);
      if (opts?.interactive) host?.setInteractive(false);
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

/** HTML document that hosts Puter.js and speaks JSON over postMessage. */
export const PUTER_BRIDGE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    html, body { margin: 0; padding: 0; background: #0F172A; color: #E2E8F0; font-family: -apple-system, system-ui, sans-serif; }
    #status { padding: 16px; font-size: 15px; line-height: 1.4; }
  </style>
  <script src="https://js.puter.com/v2/"></script>
</head>
<body>
  <div id="status">Connecting to Puter cloud…</div>
  <script>
    function post(msg) {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
      } catch (e) {}
    }

    function setStatus(t) {
      var el = document.getElementById('status');
      if (el) el.textContent = t;
    }

    async function handle(req) {
      var id = req.id;
      try {
        if (!window.puter) throw new Error('Puter SDK not loaded');
        var data = null;
        switch (req.action) {
          case 'isSignedIn':
            data = !!puter.auth.isSignedIn();
            break;
          case 'signIn':
            setStatus('Sign in with Puter…');
            if (!puter.auth.isSignedIn()) {
              await puter.auth.signIn();
            }
            data = await puter.auth.getUser();
            setStatus('Signed in');
            break;
          case 'signOut':
            if (puter.auth.isSignedIn()) await puter.auth.signOut();
            data = true;
            setStatus('Signed out');
            break;
          case 'getUser':
            data = puter.auth.isSignedIn() ? await puter.auth.getUser() : null;
            break;
          case 'kvGet':
            data = await puter.kv.get(req.payload.key);
            break;
          case 'kvSet':
            data = await puter.kv.set(req.payload.key, req.payload.value);
            break;
          case 'fsWrite':
            try { await puter.fs.mkdir(req.payload.dir, { overwrite: false }); } catch (e) {}
            data = await puter.fs.write(req.payload.path, req.payload.value);
            break;
          case 'fsRead':
            var blob = await puter.fs.read(req.payload.path);
            data = await blob.text();
            break;
          default:
            throw new Error('Unknown action: ' + req.action);
        }
        post({ id: id, ok: true, data: data });
      } catch (e) {
        post({ id: id, ok: false, error: (e && e.message) ? e.message : String(e) });
      }
    }

    function onReady() {
      setStatus('Puter ready');
      post({ type: 'ready' });
    }

    if (window.puter && puter.auth) onReady();
    else {
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        if (window.puter && puter.auth) {
          clearInterval(t);
          onReady();
        } else if (tries > 50) {
          clearInterval(t);
          setStatus('Failed to load Puter');
          post({ type: 'ready' });
        }
      }, 100);
    }

    // RN injects: window.__puterHandle(JSON.stringify(req))
    window.__puterHandle = function (raw) {
      try {
        var req = typeof raw === 'string' ? JSON.parse(raw) : raw;
        handle(req);
      } catch (e) {
        post({ id: 'unknown', ok: false, error: String(e) });
      }
    };
  </script>
</body>
</html>`;
