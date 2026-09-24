import type { ChartResult, ComparisonResult } from '../astrology/contracts';
import { CHART_SCHEMA_VERSION } from '../astrology/contracts';
import { createServerSupabaseClient } from './server';

export async function saveChartSnapshot(input: {
  clientId?: string | null;
  subjectName: string;
  birthDate?: string | null;
  localTime?: string | null;
  locationName?: string;
  timezoneName?: string;
  latitude?: number | null;
  longitude?: number | null;
  classic: ChartResult;
  modern: ChartResult;
  comparison: ComparisonResult;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error('Authentication required');

  const { data, error } = await supabase.from('charts').insert({
    owner_id: user.id,
    client_id: input.clientId ?? null,
    subject_name: input.subjectName,
    birth_date: input.birthDate ?? null,
    local_time: input.localTime ?? null,
    location_name: input.locationName ?? '',
    timezone_name: input.timezoneName ?? '',
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    classic_result: input.classic as unknown as never,
    modern_result: input.modern as unknown as never,
    comparison_result: input.comparison as unknown as never,
    schema_version: CHART_SCHEMA_VERSION,
  }).select('id').single();

  if (error) throw error;
  return data;
}
