/**
 * Fixed Stars Module — Types
 * Vega 7 Revival: Estrelas Fixas com precessão IAU 1976
 */

/** Entrada do catálogo JSON — coordenadas J2000.0 */
export interface FixedStarCatalogEntry {
  id: string;
  name: string;
  /** Designação para sefstars.txt, ex: "alTau" */
  designation: string;
  constellation: string;
  influence: string;
  /** Ascensão Reta em graus decimais, J2000.0 */
  ra_j2000: number;
  /** Declinação em graus decimais, J2000.0 */
  dec_j2000: number;
  source: string;
}

/** Posição calculada para a data do mapa (após precessão) */
export interface FixedStarPosition {
  id: string;
  name: string;
  constellation: string;
  influence: string;
  source: string;
  /** Longitude eclíptica em graus decimais [0, 360) */
  longitude: number;
  /** Latitude eclíptica em graus decimais */
  latitude: number;
  /** Longitude formatada no padrão zodiacal Vega: "09°47' Gêmeos" */
  longitude_zodiac: string;
}

/** Tipos de aspecto suportados pelo módulo Vega 7 */
export type FixedStarAspectType = 'conjunction' | 'square' | 'opposition';

/** Aspecto entre uma estrela fixa e um planeta */
export interface FixedStarAspect {
  star_id: string;
  star_name: string;
  /** Nome do planeta em português */
  planet: string;
  /** Chave interna do planeta, ex: "sun", "moon" */
  planet_key: string;
  aspect_type: FixedStarAspectType;
  /** Símbolo do aspecto: ☌ □ ☍ */
  aspect_symbol: string;
  /** Orbe em graus (valor absoluto) */
  orb: number;
  /** Sempre null para estrelas fixas — applying/separating não calculado */
  applying: null;
  /** Status do orbe: "provisional" pois manual do Vega 7 não confirma valor */
  orb_status: 'provisional';
}

/** Configuração do módulo de estrelas fixas */
export interface FixedStarsConfig {
  orbs: {
    /** Orbe para conjunção em graus. Default: 1.0 */
    conjunction: number;
    /** Orbe para quadratura em graus. Default: 1.0 */
    square: number;
    /** Orbe para oposição em graus. Default: 1.0 */
    opposition: number;
  };
}

export const DEFAULT_FIXED_STARS_CONFIG: FixedStarsConfig = {
  orbs: {
    conjunction: 1.0,
    square: 1.0,
    opposition: 1.0,
  },
};

/** Resultado completo do módulo de estrelas fixas */
export interface FixedStarsResult {
  stars: FixedStarPosition[];
  aspects: FixedStarAspect[];
  /** Data de cálculo ISO 8601 */
  computed_at: string;
  /** Julian Day UT usado para a precessão */
  jd_ut: number;
  /** Época do mapa em anos julianos (ex: 1989.06) */
  epoch_year: number;
  /** Versão do módulo */
  module_version: string;
  /** Configuração de orbes utilizada */
  config: FixedStarsConfig;
}

/** Planetas incluídos na análise de aspectos (conforme Vega 7) */
export const FIXED_STARS_PLANETS = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
] as const;

export type FixedStarsPlanetKey = typeof FIXED_STARS_PLANETS[number];

export const PLANET_LABELS_PT: Record<FixedStarsPlanetKey, string> = {
  sun: 'Sol',
  moon: 'Lua',
  mercury: 'Mercúrio',
  venus: 'Vênus',
  mars: 'Marte',
  jupiter: 'Júpiter',
  saturn: 'Saturno',
  uranus: 'Urano',
  neptune: 'Netuno',
  pluto: 'Plutão',
};
