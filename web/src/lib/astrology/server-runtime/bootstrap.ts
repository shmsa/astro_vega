import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let bootstrapped = false;

export function ensureSwissWasmEnvironment() {
  if (bootstrapped) return;

  // NOTE: Do NOT polyfill globalThis.window here. The @swisseph/browser WASM
  // loading is handled by the data URI fallback in swiss-wasm-provider.ts.
  // Setting globalThis.window = globalThis breaks Next.js SSR on Netlify
  // because the server handler expects window.location to exist when window
  // is defined.

  const origFetch = globalThis.fetch;
  const cacheDir = path.resolve(process.cwd(), 'node_modules', '.cache', 'swisseph-ephe');
  const CDN_BASE = 'https://cdn.jsdelivr.net/gh/aloistr/swisseph/ephe';

  globalThis.fetch = async (url: RequestInfo | URL, opts?: RequestInit) => {
    const s = String(url);
    // Handle swisseph.wasm loading in serverless/Node environments (HTTP, file://, relative)
    if (s.includes('swisseph.wasm')) {
      try {
        const localPath = path.resolve(process.cwd(), 'node_modules/@swisseph/browser/dist/swisseph.wasm');
        const buf = await fs.readFile(localPath);
        return new Response(buf, { status: 200, headers: { 'Content-Type': 'application/wasm' } });
      } catch {
        const { SWISSEPH_WASM_BASE64 } = await import('./wasm-binary');
        const buf = Buffer.from(SWISSEPH_WASM_BASE64, 'base64');
        return new Response(buf, { status: 200, headers: { 'Content-Type': 'application/wasm' } });
      }
    }

    if (s.startsWith('file://')) {
      try {
        const buf = await fs.readFile(fileURLToPath(s));
        return new Response(buf, { status: 200, headers: { 'Content-Type': 'application/wasm' } });
      } catch {
        // Fall back to origFetch or ignore if file doesn't exist
      }
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
            try {
              await fs.mkdir(cacheDir, { recursive: true });
              await fs.writeFile(localCachedPath, Buffer.from(ab));
            } catch {
              // Read-only filesystem in Lambda: continue with in-memory buffer
            }
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
