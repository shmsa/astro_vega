import { NextResponse } from 'next/server';
export function GET() {
  return NextResponse.json({ ok: true, app: 'astro-vega', version: '0.8', schema_version: 1 });
}
