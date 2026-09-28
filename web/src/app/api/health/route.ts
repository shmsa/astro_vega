import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    ok: true,
    app: 'astro-vega',
    app_version: '1.0-rc',
    engine_version: '1.7',
    schema_version: 1,
  });
}
