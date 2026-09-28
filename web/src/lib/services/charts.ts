import { PoolClient } from '@neondatabase/serverless';
import { withAuthenticatedTenant } from '@/lib/db';
import type { ChartResult, ComparisonResult } from '@/lib/astrology/contracts';
import { CHART_SCHEMA_VERSION } from '@/lib/astrology/contracts';

export interface ChartRecord {
  id: string;
  owner_id: string;
  client_id: string | null;
  chart_name: string;
  chart_type: 'natal';
  profile_key: 'vega_classic' | 'modern_swiss' | 'comparative';
  schema_version: number;
  engine_version: string;
  profile_version: string;
  calculation_metadata: Record<string, unknown>;
  calc_date: string;
  calc_time_local: string;
  calc_timezone: string;
  calc_utc: string;
  utc_offset_minutes: number;
  utc_offset_hours: number;
  latitude: number;
  longitude: number;
  altitude_meters: number;
  house_system: string;
  zodiac: string;
  julian_day_utc: number;
  delta_t_seconds: number | null;
  sidereal_time_armc: number | null;
  classic_result: ChartResult | null;
  modern_result: ChartResult | null;
  comparison_result: ComparisonResult | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SaveChartInput {
  clientId?: string | null;
  chartName: string;
  profileKey: 'vega_classic' | 'modern_swiss' | 'comparative';
  calcDate: string;
  calcTimeLocal: string;
  calcTimezone: string;
  calcUtc: string;
  utcOffsetMinutes: number;
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  julianDayUtc: number;
  deltaTSeconds?: number | null;
  siderealTimeArmc?: number | null;
  calculationMetadata?: Record<string, unknown>;
  classicResult?: ChartResult | null;
  modernResult?: ChartResult | null;
  comparisonResult?: ComparisonResult | null;
  notes?: string | null;
  tags?: string[];
}

export async function saveChart(
  userId: string,
  input: SaveChartInput
): Promise<ChartRecord> {
  if (!input.chartName || input.chartName.trim() === '') {
    throw new Error('Nome do mapa é obrigatório.');
  }

  return withAuthenticatedTenant(userId, async (client: PoolClient) => {
    // Regra 8: Ao criar ou editar chart.client_id, validar que o client pertence ao usuário autenticado.
    if (input.clientId) {
      const clientCheck = await client.query(
        `SELECT id FROM public.clients WHERE id = $1 AND owner_id = $2`,
        [input.clientId, userId]
      );
      if (clientCheck.rows.length === 0) {
        throw new Error('Consulente não encontrado ou não pertence ao usuário autenticado.');
      }
    }

    const defaultMetadata = {
      ephemeris_sources: {
        classic: 'moshier_analytical',
        modern: 'swiss_ephemeris_se1',
      },
      chiron_source: 'swiss_ephemeris_se1',
      house_system: 'topocentric_polich_page',
    };

    const res = await client.query<ChartRecord>(
      `INSERT INTO public.charts (
        owner_id,
        client_id,
        chart_name,
        chart_type,
        profile_key,
        schema_version,
        engine_version,
        profile_version,
        calculation_metadata,
        calc_date,
        calc_time_local,
        calc_timezone,
        calc_utc,
        utc_offset_minutes,
        latitude,
        longitude,
        altitude_meters,
        house_system,
        zodiac,
        julian_day_utc,
        delta_t_seconds,
        sidereal_time_armc,
        classic_result,
        modern_result,
        comparison_result,
        notes,
        tags
      ) VALUES (
        $1, $2, $3, 'natal', $4,
        $5, '1.7', 'VEGA_GOODLUCK_PROFILE_V1',
        $6, $7, $8, $9, $10,
        $11, $12, $13, COALESCE($14, 0.0), 'T', 'tropical',
        $15, $16, $17,
        $18, $19, $20,
        $21, COALESCE($22, '{}')
      ) RETURNING *`,
      [
        userId,
        input.clientId ?? null,
        input.chartName.trim(),
        input.profileKey,
        CHART_SCHEMA_VERSION,
        JSON.stringify(input.calculationMetadata ?? defaultMetadata),
        input.calcDate,
        input.calcTimeLocal,
        input.calcTimezone,
        input.calcUtc,
        input.utcOffsetMinutes,
        input.latitude,
        input.longitude,
        input.altitudeMeters ?? 0.0,
        input.julianDayUtc,
        input.deltaTSeconds ?? null,
        input.siderealTimeArmc ?? null,
        input.classicResult ? JSON.stringify(input.classicResult) : null,
        input.modernResult ? JSON.stringify(input.modernResult) : null,
        input.comparisonResult ? JSON.stringify(input.comparisonResult) : null,
        input.notes ?? null,
        input.tags ?? [],
      ]
    );

    return res.rows[0];
  });
}

export async function listCharts(userId: string): Promise<Array<Pick<
  ChartRecord,
  'id' | 'chart_name' | 'chart_type' | 'profile_key' | 'client_id' | 'calc_date' | 'calc_time_local' | 'created_at' | 'schema_version'
>>> {
  return withAuthenticatedTenant(userId, async (client: PoolClient) => {
    const res = await client.query(
      `SELECT id, chart_name, chart_type, profile_key, client_id, calc_date, calc_time_local, created_at, schema_version
       FROM public.charts
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  });
}

/**
 * Regra 11: Não recalcular automaticamente mapas antigos ao abrir;
 * ler estritamente os snapshots persistidos.
 */
export async function getChartById(
  userId: string,
  chartId: string
): Promise<ChartRecord | null> {
  return withAuthenticatedTenant(userId, async (client: PoolClient) => {
    const res = await client.query<ChartRecord>(
      `SELECT * FROM public.charts WHERE id = $1 AND owner_id = $2`,
      [chartId, userId]
    );
    return res.rows[0] ?? null;
  });
}

export async function deleteChart(
  userId: string,
  chartId: string
): Promise<boolean> {
  return withAuthenticatedTenant(userId, async (client: PoolClient) => {
    const res = await client.query(
      `DELETE FROM public.charts WHERE id = $1 AND owner_id = $2 RETURNING id`,
      [chartId, userId]
    );
    return res.rowCount !== null && res.rowCount > 0;
  });
}
