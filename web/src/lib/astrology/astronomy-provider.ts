import type { BodyPosition, ChartResult, EngineId, Subject } from './contracts';

export interface RawAstronomyBody {
  key: string;
  longitude: number;
  declination: number | null;
  speed_longitude: number | null;
}

export interface RawAstronomyResult {
  engineId: EngineId;
  utc: string;
  julianDayUt: number;
  ascendant: number;
  midheaven: number;
  cusps: [number, number, number, number, number, number, number, number, number, number, number, number];
  bodies: Record<string, RawAstronomyBody>;
  houseCalculation: Record<string, unknown>;
  warnings: string[];
}

export interface AstronomyProvider {
  readonly providerId: string;
  calculateClassic(subject: Subject): Promise<RawAstronomyResult>;
  calculateModern(subject: Subject): Promise<RawAstronomyResult>;
}

/**
 * Backend contract frozen in V1.0.
 *
 * Classic Vega:
 * - Moshier analytical ephemeris for planetary positions.
 * - Mean Node and Mean Lunar Apogee.
 * - Chiron must use Swiss asteroid data when needed; do not silently omit it.
 * - Topocentric/Polich-Page houses using the validated classic HSL/ARMC route.
 * - Archived HSL override, when supplied, has precedence for documentary reproduction.
 *
 * Modern:
 * - Swiss Ephemeris files / high-precision mode.
 * - Same Mean Node, Mean Apogee and Polich-Page house system.
 * - Current Swiss sidereal-time/house calculation.
 *
 * The provider supplies astronomy only. Orbs, Fortune, scores, phases, house interpretation
 * and comparison remain in the validated deterministic TypeScript layer.
 */
export const ASTRONOMY_BACKEND_REQUIREMENTS = Object.freeze({
  classic: {
    ephemeris: 'moshier',
    houses: 'polich-page-topocentric',
    siderealTime: 'legacy-compatible-hsl-armc',
    node: 'mean-node',
    lilith: 'mean-apogee',
  },
  modern: {
    ephemeris: 'swiss',
    houses: 'polich-page-topocentric',
    siderealTime: 'swiss-current',
    node: 'mean-node',
    lilith: 'mean-apogee',
  },
} as const);

export type ChartAssembler = (raw: RawAstronomyResult, subject: Subject) => ChartResult;
export type PointLike = Pick<BodyPosition, 'key' | 'longitude' | 'declination' | 'speed_longitude'>;
