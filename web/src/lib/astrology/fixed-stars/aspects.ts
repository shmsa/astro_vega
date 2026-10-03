/**
 * Fixed Stars Module — Aspectos
 * Módulo Vega 7: apenas conjunção (☌ 0°), quadratura (□ 90°), oposição (☍ 180°)
 */

import type {
  FixedStarAspect,
  FixedStarAspectType,
  FixedStarPosition,
  FixedStarsConfig,
  FixedStarsPlanetKey,
} from './types';
import { PLANET_LABELS_PT, FIXED_STARS_PLANETS, DEFAULT_FIXED_STARS_CONFIG } from './types';

/** Definição dos aspectos suportados */
const ASPECT_DEFINITIONS: Array<{
  type: FixedStarAspectType;
  angle: number;
  symbol: string;
}> = [
  { type: 'conjunction', angle: 0, symbol: '☌' },
  { type: 'square', angle: 90, symbol: '□' },
  { type: 'opposition', angle: 180, symbol: '☍' },
];

/**
 * Calcula a diferença angular mínima entre dois pontos eclípticos (em graus).
 * Retorna sempre um valor em [0, 180].
 */
function angularDiff(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * Calcula todos os aspectos entre estrelas fixas e planetas.
 *
 * @param stars - Lista de estrelas com posições calculadas para a data do mapa
 * @param planetLongitudes - Mapa de chave → longitude eclíptica em graus
 * @param config - Configuração de orbes (default: 1°00' para todos)
 * @returns Lista de aspectos encontrados
 */
export function computeFixedStarAspects(
  stars: FixedStarPosition[],
  planetLongitudes: Partial<Record<FixedStarsPlanetKey, number>>,
  config: FixedStarsConfig = DEFAULT_FIXED_STARS_CONFIG
): FixedStarAspect[] {
  const aspects: FixedStarAspect[] = [];

  for (const star of stars) {
    for (const planetKey of FIXED_STARS_PLANETS) {
      const planetLon = planetLongitudes[planetKey];
      if (planetLon === undefined) continue;

      const diff = angularDiff(star.longitude, planetLon);

      for (const aspectDef of ASPECT_DEFINITIONS) {
        const orbe = Math.abs(diff - aspectDef.angle);
        const maxOrbe = config.orbs[aspectDef.type];

        if (orbe <= maxOrbe) {
          aspects.push({
            star_id: star.id,
            star_name: star.name,
            planet: PLANET_LABELS_PT[planetKey],
            planet_key: planetKey,
            aspect_type: aspectDef.type,
            aspect_symbol: aspectDef.symbol,
            orb: Math.round(orbe * 1000) / 1000,
            applying: null,
            orb_status: 'provisional / not documented in Vega manual',
          });
          break;
        }
      }
    }
  }

  aspects.sort((a, b) => a.orb - b.orb);
  return aspects;
}
