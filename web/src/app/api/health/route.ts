import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('diag') === 'true') {
    return POST();
  }

  return NextResponse.json({
    ok: true,
    app: 'astro-vega',
    app_version: '1.0-rc',
    engine_version: '1.7',
    schema_version: 1,
  });
}

export async function POST() {
  const diag: Record<string, unknown> = {};
  diag.node_version = process.version;
  diag.env_database_url_set = !!process.env.DATABASE_URL;

  // 1. Test Postgres
  try {
    const { getDbPool } = await import('@/lib/db');
    const pool = getDbPool();
    const res = await pool.query('SELECT 1 as connected');
    diag.db_pool = { success: true, rows: res.rows };
  } catch (err: unknown) {
    diag.db_pool = { success: false, error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined };
  }

  // 2. Test Swiss WASM init
  try {
    const { ensureSwissWasmEnvironment } = await import('@/lib/astrology/server-runtime/bootstrap');
    ensureSwissWasmEnvironment();
    const { SwissWasmAstronomyProvider } = await import('@/lib/astrology/swiss-wasm-provider');
    const provider = new SwissWasmAstronomyProvider({ preloadSwissFiles: false });
    const res = await provider.calculateClassic({
      name: 'Test',
      date: '1989-01-23',
      local_time: '10:55:00',
      latitude: -1.45,
      longitude: -48.5,
      utc_offset_hours: -3
    });
    diag.wasm = { success: true, ascendant: res.ascendant };
  } catch (err: unknown) {
    diag.wasm = { success: false, error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined };
  }

  return NextResponse.json(diag);
}
