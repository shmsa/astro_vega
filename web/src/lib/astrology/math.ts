import type {
  Aspect,
  BodyPosition,
  ChartResult,
  ComparisonResult,
  DeclinationAspect,
  PointComparison,
  Scores,
} from './contracts';
import { VEGA_GOODLUCK_PROFILE_V1 } from './profile';

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export const SIGNS_PT = [
  'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
  'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes',
] as const;

const ELEMENTS = ['Fogo', 'Terra', 'Ar', 'Água', 'Fogo', 'Terra', 'Ar', 'Água', 'Fogo', 'Terra', 'Ar', 'Água'] as const;
const MODALITIES = ['Cardeal', 'Fixo', 'Mutável', 'Cardeal', 'Fixo', 'Mutável', 'Cardeal', 'Fixo', 'Mutável', 'Cardeal', 'Fixo', 'Mutável'] as const;
const POLARITIES = ['Ativo', 'Receptivo', 'Ativo', 'Receptivo', 'Ativo', 'Receptivo', 'Ativo', 'Receptivo', 'Ativo', 'Receptivo', 'Ativo', 'Receptivo'] as const;

export const ASPECT_DEFINITIONS = [
  { type: 'conjunction', name: 'Conjunção', glyph: '☌', exact: 0, maxOrb: VEGA_GOODLUCK_PROFILE_V1.aspectOrbs.conjunction, nature: 'neutral' },
  { type: 'sextile', name: 'Sextil', glyph: '✶', exact: 60, maxOrb: VEGA_GOODLUCK_PROFILE_V1.aspectOrbs.sextile, nature: 'harmonic' },
  { type: 'square', name: 'Quadratura', glyph: '□', exact: 90, maxOrb: VEGA_GOODLUCK_PROFILE_V1.aspectOrbs.square, nature: 'tense' },
  { type: 'trine', name: 'Trígono', glyph: '△', exact: 120, maxOrb: VEGA_GOODLUCK_PROFILE_V1.aspectOrbs.trine, nature: 'harmonic' },
  { type: 'opposition', name: 'Oposição', glyph: '☍', exact: 180, maxOrb: VEGA_GOODLUCK_PROFILE_V1.aspectOrbs.opposition, nature: 'tense' },
] as const;

export function norm360(value: number): number {
  return ((value % 360) + 360) % 360;
}

export function angularDistance(a: number, b: number): number {
  const d = Math.abs(norm360(a) - norm360(b));
  return Math.min(d, 360 - d);
}

export function signedAngularDelta(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

export function signIndex(longitude: number): number {
  return Math.floor(norm360(longitude) / 30);
}

export function roundArcminute(longitude: number): [number, number, number] {
  const lon = norm360(longitude);
  const totalMinutes = Math.floor(lon * 60 + 0.5) % (360 * 60);
  const sign = Math.floor(totalMinutes / (30 * 60));
  const within = totalMinutes % (30 * 60);
  return [sign, Math.floor(within / 60), within % 60];
}

export function formatZodiac(longitude: number, retrograde = false, portuguese = true): string {
  const [s, d, m] = roundArcminute(longitude);
  const sign = portuguese ? SIGNS_PT[s] : SIGNS[s];
  return `${String(d).padStart(2, '0')}°${String(m).padStart(2, '0')}' ${sign}${retrograde ? ' R' : ''}`;
}

export function findHouse(longitude: number, cusps: readonly number[]): number {
  if (cusps.length !== 12) throw new Error('Exactly 12 house cusps are required');
  const lon = norm360(longitude);
  for (let i = 0; i < 12; i += 1) {
    const c1 = norm360(cusps[i]);
    const c2 = norm360(cusps[(i + 1) % 12]);
    const span = norm360(c2 - c1);
    const rel = norm360(lon - c1);
    if (rel < span || Math.abs(rel - span) < 1e-12) return i + 1;
  }
  throw new Error('Could not assign house');
}

export function interpretiveHouse(longitude: number, geometricHouse: number, cusps: readonly number[]): number {
  if (!Number.isInteger(geometricHouse) || geometricHouse < 1 || geometricHouse > 12) {
    throw new Error('geometricHouse must be an integer from 1 to 12');
  }
  const nextHouse = (geometricHouse % 12) + 1;
  const nextCusp = norm360(cusps[nextHouse - 1]);
  const distance = norm360(nextCusp - norm360(longitude));
  const limit = [1, 4, 7, 10].includes(nextHouse)
    ? VEGA_GOODLUCK_PROFILE_V1.houseOrbs.angular
    : VEGA_GOODLUCK_PROFILE_V1.houseOrbs.other;
  return distance <= limit ? nextHouse : geometricHouse;
}

export function lunarPhase(sunLongitude: number, moonLongitude: number): 'Nova' | 'Crescente' | 'Cheia' | 'Minguante' {
  const d = norm360(moonLongitude - sunLongitude);
  if (d < 90) return 'Nova';
  if (d < 180) return 'Crescente';
  if (d < 270) return 'Cheia';
  return 'Minguante';
}

export function partOfFortune(asc: number, moon: number, sun: number): number {
  return norm360(asc + moon - sun);
}

export function aspectBetween(a: BodyPosition, b: BodyPosition): Aspect | null {
  const separation = angularDistance(a.longitude, b.longitude);
  for (const definition of ASPECT_DEFINITIONS) {
    const orb = Math.abs(separation - definition.exact);
    if (orb <= definition.maxOrb + 1e-12) {
      let applying: boolean | null = null;
      if (a.speed_longitude !== null && b.speed_longitude !== null) {
        const a2 = norm360(a.longitude + a.speed_longitude / 24);
        const b2 = norm360(b.longitude + b.speed_longitude / 24);
        const separation2 = angularDistance(a2, b2);
        applying = Math.abs(separation2 - definition.exact) < orb;
      }
      return {
        a: a.key,
        b: b.key,
        type: definition.type,
        name: definition.name,
        glyph: definition.glyph,
        exact_angle: definition.exact,
        separation,
        orb,
        max_orb: definition.maxOrb,
        nature: definition.nature,
        applying,
      };
    }
  }
  return null;
}

export function declinationRelation(a: BodyPosition, b: BodyPosition, maxOrb = VEGA_GOODLUCK_PROFILE_V1.parallelOrb): DeclinationAspect | null {
  if (a.declination === null || b.declination === null) return null;
  const da = a.declination;
  const db = b.declination;
  if (da * db >= 0) {
    const orb = Math.abs(da - db);
    return orb <= maxOrb ? { a: a.key, b: b.key, type: 'parallel', orb } : null;
  }
  const orb = Math.abs(Math.abs(da) - Math.abs(db));
  return orb <= maxOrb ? { a: a.key, b: b.key, type: 'contra_parallel', orb } : null;
}

export function scoreDistribution(points: Record<string, BodyPosition>): Scores {
  const output: Scores = {
    elements: { Fogo: 0, Terra: 0, Ar: 0, Água: 0 },
    modalities: { Cardeal: 0, Fixo: 0, Mutável: 0 },
    polarities: { Ativo: 0, Receptivo: 0 },
  };
  for (const [key, weight] of Object.entries(VEGA_GOODLUCK_PROFILE_V1.scoring)) {
    const point = points[key];
    if (!point) throw new Error(`Missing scoring point: ${key}`);
    const sign = point.sign_index;
    output.elements[ELEMENTS[sign]] += weight;
    output.modalities[MODALITIES[sign]] += weight;
    output.polarities[POLARITIES[sign]] += weight;
  }
  return output;
}

export function calculateAspects(points: Record<string, BodyPosition>, order: readonly string[]): Aspect[] {
  const aspects: Aspect[] = [];
  for (let i = 0; i < order.length; i += 1) {
    for (let j = i + 1; j < order.length; j += 1) {
      const a = points[order[i]];
      const b = points[order[j]];
      if (!a || !b) continue;
      const aspect = aspectBetween(a, b);
      if (aspect) aspects.push(aspect);
    }
  }
  return aspects;
}

export function calculateDeclinationAspects(points: Record<string, BodyPosition>, order: readonly string[]): DeclinationAspect[] {
  const relations: DeclinationAspect[] = [];
  for (let i = 0; i < order.length; i += 1) {
    for (let j = i + 1; j < order.length; j += 1) {
      const a = points[order[i]];
      const b = points[order[j]];
      if (!a || !b) continue;
      const relation = declinationRelation(a, b);
      if (relation) relations.push(relation);
    }
  }
  return relations;
}

export function compareChartsPure(classic: ChartResult, modern: ChartResult): ComparisonResult {
  if (classic.subject.name !== modern.subject.name) throw new Error('Charts appear to belong to different subjects');
  const preferred = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Node', 'Lilith', 'Chiron', 'ASC', 'MC', 'Fortune'];
  const keys = preferred.filter((key) => classic.points[key] && modern.points[key]);
  const points: Record<string, PointComparison> = {};

  for (const key of keys) {
    const c = classic.points[key];
    const m = modern.points[key];
    const delta = signedAngularDelta(c.longitude, m.longitude);
    points[key] = {
      name: c.name,
      classic_longitude: c.longitude,
      modern_longitude: m.longitude,
      classic_display: formatZodiac(c.longitude, c.retrograde),
      modern_display: formatZodiac(m.longitude, m.retrograde),
      delta_degrees: delta,
      delta_arcminutes: delta * 60,
      same_display_minute: roundArcminute(c.longitude).join(':') === roundArcminute(m.longitude).join(':'),
      classic_house: c.house_geometric,
      modern_house: m.house_geometric,
      classic_interpretive_house: c.house_interpretive,
      modern_interpretive_house: m.house_interpretive,
    };
  }

  const cusps = classic.cusps.map((c, index) => {
    const m = modern.cusps[index];
    const delta = signedAngularDelta(c, m);
    return {
      house: index + 1,
      classic: c,
      modern: m,
      delta_degrees: delta,
      delta_arcminutes: delta * 60,
      same_display_minute: roundArcminute(c).join(':') === roundArcminute(m).join(':'),
    };
  });

  const tupleKey = (aspect: Aspect) => `${aspect.a}\u0000${aspect.b}\u0000${aspect.type}`;
  const classicSet = new Set(classic.aspects.map(tupleKey));
  const modernSet = new Set(modern.aspects.map(tupleKey));
  const decode = (value: string): [string, string, string] => value.split('\u0000') as [string, string, string];
  const classicOnly = [...classicSet].filter((x) => !modernSet.has(x)).sort().map(decode);
  const modernOnly = [...modernSet].filter((x) => !classicSet.has(x)).sort().map(decode);
  const sameCount = [...classicSet].filter((x) => modernSet.has(x)).length;

  return {
    subject: classic.subject as unknown as Record<string, unknown>,
    classic_engine: classic.engine as unknown as Record<string, unknown>,
    modern_engine: modern.engine as unknown as Record<string, unknown>,
    points,
    cusps,
    aspect_changes: {
      classic_only: classicOnly,
      modern_only: modernOnly,
      same_count: sameCount,
    },
    scores_equal: JSON.stringify(classic.scores) === JSON.stringify(modern.scores),
    lunar_phase_equal: classic.lunar_phase === modern.lunar_phase,
  };
}
