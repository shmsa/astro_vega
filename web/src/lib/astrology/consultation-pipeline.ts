import type { AstronomyProvider, ChartAssembler } from './astronomy-provider';
import type { ConsultationProfileId, Subject } from './contracts';
import { compareChartsPure } from './math';
import type { ConsultationResult } from './consultation-profiles';

export async function runConsultationProfile(
  profile: ConsultationProfileId,
  subject: Subject,
  provider: AstronomyProvider,
  assemble: ChartAssembler,
): Promise<ConsultationResult> {
  if (profile === 'classic') {
    const classic = assemble(await provider.calculateClassic(subject), subject);
    return { profile, subject, classic_result: classic };
  }
  if (profile === 'modern') {
    const modern = assemble(await provider.calculateModern(subject), subject);
    return { profile, subject, modern_result: modern };
  }
  const [classicRaw, modernRaw] = await Promise.all([
    provider.calculateClassic(subject),
    provider.calculateModern(subject),
  ]);
  const classic = assemble(classicRaw, subject);
  const modern = assemble(modernRaw, subject);
  return {
    profile,
    subject,
    classic_result: classic,
    modern_result: modern,
    comparison_result: compareChartsPure(classic, modern),
  };
}
