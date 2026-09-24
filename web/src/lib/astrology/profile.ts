import type { AspectType } from './contracts';

export const VEGA_GOODLUCK_PROFILE_V1 = Object.freeze({
  zodiac: 'tropical',
  houseSystem: 'topocentric-polich-page',
  node: 'mean-north-node',
  lilith: 'mean-lunar-apogee',
  fortuneFormula: 'ASC + Moon - Sun',
  aspectOrbs: {
    conjunction: 9,
    opposition: 8,
    trine: 7,
    square: 6,
    sextile: 4,
  } satisfies Record<AspectType, number>,
  houseOrbs: { angular: 10, other: 5 },
  parallelOrb: 1,
  scoring: {
    Sun: 2, Moon: 2, Mercury: 1, Venus: 1, Mars: 1, Jupiter: 1,
    Saturn: 1, Uranus: 1, Neptune: 1, Pluto: 1, ASC: 2, MC: 2,
  },
  displayRounding: 'nearest-arcminute',
} as const);
