/**
 * Fixed Stars Module — Service (Orquestrador principal)
 */

import { getAllStars } from './catalog';
import { precessToDate, jdToEpochYear } from './precession';
import { computeFixedStarAspects } from './aspects';
import type {
  FixedStarsResult,
  FixedStarsConfig,
  FixedStarPosition,
  FixedStarsPlanetKey,
} from './types';
import { DEFAULT_FIXED_STARS_CONFIG } from './types';
import { formatZodiacPrecise } from '../format';

/**
 * Calcula o módulo completo de Estrelas Fixas para um dado Julian Day e posições planetárias.
 */
export function computeFixedStars(
  jd_ut: number,
  planetLongitudes: Partial<Record<FixedStarsPlanetKey, number>>,
  config: FixedStarsConfig = DEFAULT_FIXED_STARS_CONFIG
): FixedStarsResult {
  const catalog = getAllStars();

  const stars: FixedStarPosition[] = catalog.map((entry) => {
    const { longitude, latitude } = precessToDate(entry.ra_j2000, entry.dec_j2000, jd_ut);

    return {
      id: entry.id,
      name: entry.name,
      constellation: entry.constellation,
      influence: entry.influence,
      source: entry.source,
      longitude,
      latitude,
      longitude_zodiac: formatZodiacPrecise(longitude, { portuguese: true }),
    };
  });

  const starsZodiacal = [...stars].sort((a, b) => a.longitude - b.longitude);
  const aspects = computeFixedStarAspects(stars, planetLongitudes, config);

  return {
    stars: starsZodiacal,
    aspects,
    computed_at: new Date().toISOString(),
    jd_ut,
    epoch_year: Math.round(jdToEpochYear(jd_ut) * 100) / 100,
    module_version: '1.0.0',
    config,
  };
}
