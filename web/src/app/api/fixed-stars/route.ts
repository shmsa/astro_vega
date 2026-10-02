/**
 * POST /api/fixed-stars
 * 
 * Calcula posições e aspectos de estrelas fixas para um dado JD e planetas.
 * Requer autenticação (mesma sessão do usuário).
 * 
 * Body: {
 *   jd_ut: number,
 *   planets: Partial<Record<FixedStarsPlanetKey, number>>,
 *   config?: FixedStarsConfig
 * }
 * 
 * Response: { result: FixedStarsResult }
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { computeFixedStars } from '@/lib/astrology/fixed-stars/service';
import type { FixedStarsConfig, FixedStarsPlanetKey } from '@/lib/astrology/fixed-stars/types';
import { getChartModule, saveChartModule } from '@/lib/services/charts';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const chartId = searchParams.get('chart_id');

  if (!chartId) {
    return NextResponse.json({ error: 'chart_id é obrigatório.' }, { status: 400 });
  }

  try {
    const record = await getChartModule(session.user.id, chartId, 'fixed_stars');
    return NextResponse.json({ module: record });
  } catch (err: unknown) {
    console.error('[fixed-stars] Fetch error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jd_ut, planets, config, chart_id } = body as {
      jd_ut: number;
      planets: Partial<Record<FixedStarsPlanetKey, number>>;
      config?: FixedStarsConfig;
      chart_id?: string;
    };

    if (typeof jd_ut !== 'number' || jd_ut <= 0) {
      return NextResponse.json(
        { error: 'jd_ut inválido. Deve ser um número positivo (Julian Day UT).' },
        { status: 400 }
      );
    }

    if (!planets || typeof planets !== 'object') {
      return NextResponse.json(
        { error: 'planets deve ser um objeto com chaves planetárias e longitudes em graus.' },
        { status: 400 }
      );
    }

    const result = computeFixedStars(jd_ut, planets, config);

    // Se fornecido chart_id, persiste no banco de dados Neon
    let savedModule = null;
    if (chart_id) {
      try {
        savedModule = await saveChartModule(
          session.user.id,
          chart_id,
          'fixed_stars',
          result.module_version,
          result as unknown as Record<string, unknown>,
          (config || {}) as unknown as Record<string, unknown>
        );
      } catch (saveErr) {
        console.warn('[fixed-stars] Warning: Failed to persist module to chart_modules:', saveErr);
      }
    }

    return NextResponse.json({ result, module: savedModule });
  } catch (err: unknown) {
    console.error('[fixed-stars] Calculation error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

