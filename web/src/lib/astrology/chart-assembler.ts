import type {
  BodyPosition,
  ChartResult,
  Subject,
} from './contracts';
import type { RawAstronomyResult } from './astronomy-provider';
import {
  calculateAspects,
  calculateDeclinationAspects,
  findHouse,
  interpretiveHouse,
  lunarPhase,
  partOfFortune,
  scoreDistribution,
  signIndex,
} from './math';
import { VEGA_GOODLUCK_PROFILE_V1 } from './profile';

const BODY_SPECS_ORDER = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter',
  'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Node', 'Lilith', 'Chiron'
];

const GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  Node: '☊', Lilith: '⚸', Chiron: '⚷', ASC: 'Asc', MC: 'MC', Fortune: '⊗'
};

const NAMES: Record<string, string> = {
  Sun: 'Sol', Moon: 'Lua', Mercury: 'Mercúrio', Venus: 'Vênus', Mars: 'Marte',
  Jupiter: 'Júpiter', Saturn: 'Saturno', Uranus: 'Urano', Neptune: 'Netuno', Pluto: 'Plutão',
  Node: 'Nodo Norte', Lilith: 'Lilith', Chiron: 'Quíron', ASC: 'Ascendente', MC: 'Meio do Céu', Fortune: 'Parte da Fortuna'
};

export function assembleChart(raw: RawAstronomyResult, subject: Subject): ChartResult {
  const points: Record<string, BodyPosition> = {};

  for (const key of BODY_SPECS_ORDER) {
    const rawBody = raw.bodies[key];
    if (!rawBody) continue;

    const lon = rawBody.longitude;
    const si = signIndex(lon);
    points[key] = {
      key,
      name: NAMES[key] || key,
      glyph: GLYPHS[key] || key.substring(0, 2),
      longitude: lon,
      declination: rawBody.declination,
      speed_longitude: rawBody.speed_longitude,
      retrograde: (rawBody.speed_longitude ?? 0) < 0,
      sign_index: si,
      degree_in_sign: lon - si * 30,
      house_geometric: null,
      house_interpretive: null,
    };
  }

  // ASC, MC, Fortune
  const asc = raw.ascendant;
  const ascSi = signIndex(asc);
  points.ASC = {
    key: 'ASC',
    name: 'Ascendente',
    glyph: 'Asc',
    longitude: asc,
    declination: null,
    speed_longitude: null,
    retrograde: false,
    sign_index: ascSi,
    degree_in_sign: asc - ascSi * 30,
    house_geometric: 1,
    house_interpretive: 1,
  };

  const mc = raw.midheaven;
  const mcSi = signIndex(mc);
  points.MC = {
    key: 'MC',
    name: 'Meio do Céu',
    glyph: 'MC',
    longitude: mc,
    declination: null,
    speed_longitude: null,
    retrograde: false,
    sign_index: mcSi,
    degree_in_sign: mc - mcSi * 30,
    house_geometric: 10,
    house_interpretive: 10,
  };

  const moonLon = points.Moon?.longitude ?? 0;
  const sunLon = points.Sun?.longitude ?? 0;
  const fortune = partOfFortune(asc, moonLon, sunLon);
  const fortuneSi = signIndex(fortune);
  points.Fortune = {
    key: 'Fortune',
    name: 'Parte da Fortuna',
    glyph: '⊗',
    longitude: fortune,
    declination: null,
    speed_longitude: null,
    retrograde: false,
    sign_index: fortuneSi,
    degree_in_sign: fortune - fortuneSi * 30,
    house_geometric: null,
    house_interpretive: null,
  };

  // Determine houses for all points
  for (const p of Object.values(points)) {
    if (p.key === 'ASC') {
      p.house_geometric = 1;
      p.house_interpretive = 1;
    } else if (p.key === 'MC') {
      p.house_geometric = 10;
      p.house_interpretive = 10;
    } else {
      p.house_geometric = findHouse(p.longitude, raw.cusps);
      p.house_interpretive = interpretiveHouse(p.longitude, p.house_geometric, raw.cusps);
    }
  }

  const aspectOrder = [
    ...BODY_SPECS_ORDER.filter(k => points[k]),
    'ASC', 'MC', 'Fortune'
  ];

  const aspects = calculateAspects(points, aspectOrder);
  const declAspects = calculateDeclinationAspects(points, aspectOrder);
  const scores = scoreDistribution(points);
  const phase = lunarPhase(sunLon, moonLon);

  return {
    engine: {
      id: raw.engineId,
      name: raw.engineId === 'vega_classic' ? 'Clássico Vega' : 'Precisão Atual',
    },
    subject,
    utc: raw.utc,
    julian_day_ut: raw.julianDayUt,
    settings: {
      zodiac: 'tropical',
      planet_frame: 'geocentric',
      house_system: 'Topocêntrico / Polich-Page',
      house_system_code: 'T',
      node: 'Mean North Node',
      lilith: 'Mean Lunar Apogee',
      fortune_formula: 'ASC + Moon - Sun',
      house_cusp_orbs: { angular: VEGA_GOODLUCK_PROFILE_V1.houseOrbs.angular, other: VEGA_GOODLUCK_PROFILE_V1.houseOrbs.other },
      aspect_orbs: VEGA_GOODLUCK_PROFILE_V1.aspectOrbs,
      parallel_orb: VEGA_GOODLUCK_PROFILE_V1.parallelOrb,
      display_rounding: 'nearest arcminute',
    },
    house_calculation: raw.houseCalculation,
    ascendant: raw.ascendant,
    midheaven: raw.midheaven,
    cusps: raw.cusps,
    points,
    aspects,
    declination_aspects: declAspects,
    scores,
    lunar_phase: phase,
    warnings: raw.warnings,
  };
}
