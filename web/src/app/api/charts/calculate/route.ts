import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { ensureSwissWasmEnvironment } from '@/lib/astrology/server-runtime/bootstrap';
import { SwissWasmAstronomyProvider } from '@/lib/astrology/swiss-wasm-provider';
import { assembleChart } from '@/lib/astrology/chart-assembler';
import { runConsultationProfile } from '@/lib/astrology/consultation-pipeline';
import type { ConsultationProfileId, Subject } from '@/lib/astrology/contracts';

export const dynamic = 'force-dynamic';

// Certifica que o environment polyfill está ativo no Node runtime
ensureSwissWasmEnvironment();

// Provider singleton para o runtime de cálculo
const provider = new SwissWasmAstronomyProvider({ preloadSwissFiles: true });

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { profile, subject } = body as {
      profile: ConsultationProfileId;
      subject: Subject;
    };

    if (!subject || !subject.date || !subject.local_time || subject.latitude == null || subject.longitude == null) {
      return NextResponse.json({ error: 'Dados do mapa incompletos.' }, { status: 400 });
    }

    const consultationResult = await runConsultationProfile(
      profile,
      subject,
      provider,
      assembleChart
    );

    return NextResponse.json({ result: consultationResult });
  } catch (err: unknown) {
    console.error('Calculation error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
