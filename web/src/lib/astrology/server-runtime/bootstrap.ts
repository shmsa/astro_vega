import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let bootstrapped = false;

export function ensureSwissWasmEnvironment() {
  if (bootstrapped) return;

  if (typeof globalThis.window === 'undefined') {
    (globalThis as unknown as { window: unknown }).window = globalThis;
  }

  const origFetch = globalThis.fetch;
  const cacheDir = path.resolve(process.cwd(), 'node_modules', '.cache', 'swisseph-ephe');
  const CDN_BASE = 'https://cdn.jsdelivr.net/gh/aloistr/swisseph/ephe';

  globalThis.fetch = async (url: RequestInfo | URL, opts?: RequestInit) => {
    const s = String(url);
    if (s.startsWith('file://')) {
      const buf = await fs.readFile(fileURLToPath(s));
      return new Response(buf, { status: 200, headers: { 'Content-Type': 'application/wasm' } });
    }

    const basename = path.basename(s);
    if (basename.endsWith('.se1')) {
      const localCachedPath = path.join(cacheDir, basename);
      try {
        const buf = await fs.readFile(localCachedPath);
        return new Response(buf, { status: 200 });
      } catch {
        try {
          const res = await origFetch(`${CDN_BASE}/${basename}`, opts);
          if (res.ok) {
            const ab = await res.arrayBuffer();
            await fs.mkdir(cacheDir, { recursive: true });
            await fs.writeFile(localCachedPath, Buffer.from(ab));
            return new Response(ab, { status: 200 });
          }
        } catch {
          // fallback
        }
      }
    }

    return origFetch(url, opts);
  };

  bootstrapped = true;
}
