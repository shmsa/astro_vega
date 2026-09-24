export const CHART_SCHEMA_VERSION = 1 as const;

export type EngineId = 'vega_classic' | 'modern_swiss';
export type ConsultationProfileId = 'classic' | 'modern' | 'comparative';
export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
export type AspectNature = 'neutral' | 'harmonic' | 'tense';
export type DeclinationAspectType = 'parallel' | 'contraparallel';

export interface Subject {
  name: string;
  date: string;
  local_time: string;
  utc_offset_hours: number;
  latitude: number;
  longitude: number;
  location_name?: string;
  legacy_latitude?: number | null;
  legacy_longitude?: number | null;
  classic_hsl_hours?: number | null;
}

export interface EngineInfo {
  id: EngineId;
  name: string;
  ephemeris_requested_flag?: number | null;
  ephemeris_path?: string | null;
  ephemeris_retflags?: Record<string, number>;
}

export interface BodyPosition {
  key: string;
  name: string;
  glyph: string;
  longitude: number;
  declination: number | null;
  speed_longitude: number | null;
  retrograde: boolean;
  sign_index: number;
  degree_in_sign: number;
  house_geometric: number | null;
  house_interpretive: number | null;
}

export interface Aspect {
  a: string;
  b: string;
  type: AspectType;
  name: string;
  glyph: string;
  exact_angle: number;
  separation: number;
  orb: number;
  max_orb: number;
  nature: AspectNature;
  applying: boolean | null;
}

export interface DeclinationAspect {
  a: string;
  b: string;
  type: DeclinationAspectType | string;
  orb: number;
}

export interface Scores {
  elements: Record<string, number>;
  modalities: Record<string, number>;
  polarities: Record<string, number>;
}

export interface CalculationSettings {
  zodiac: string;
  planet_frame: string;
  house_system: string;
  house_system_code: string;
  node: string;
  lilith: string;
  fortune_formula: string;
  house_cusp_orbs: { angular: number; other: number };
  aspect_orbs: Record<AspectType, number>;
  parallel_orb: number;
  display_rounding: string;
}

export interface ChartResult {
  engine: EngineInfo;
  subject: Subject;
  utc: string;
  julian_day_ut: number;
  settings: CalculationSettings;
  house_calculation?: Record<string, unknown>;
  ascendant: number;
  midheaven: number;
  cusps: [number, number, number, number, number, number, number, number, number, number, number, number];
  points: Record<string, BodyPosition>;
  aspects: Aspect[];
  declination_aspects: DeclinationAspect[];
  scores: Scores;
  lunar_phase: string;
  warnings: string[];
}

export interface PointComparison {
  name: string;
  classic_longitude: number;
  modern_longitude: number;
  classic_display: string;
  modern_display: string;
  delta_degrees: number;
  delta_arcminutes: number;
  same_display_minute: boolean;
  classic_house: number | null;
  modern_house: number | null;
  classic_interpretive_house: number | null;
  modern_interpretive_house: number | null;
}

export interface ComparisonResult {
  subject: Record<string, unknown>;
  classic_engine: Record<string, unknown>;
  modern_engine: Record<string, unknown>;
  points: Record<string, PointComparison>;
  cusps: Array<{
    house: number;
    classic: number;
    modern: number;
    delta_degrees: number;
    delta_arcminutes: number;
    same_display_minute: boolean;
  }>;
  aspect_changes: {
    classic_only: Array<[string, string, string]>;
    modern_only: Array<[string, string, string]>;
    same_count: number;
  };
  scores_equal: boolean;
  lunar_phase_equal: boolean;
}

export interface PersistedChartSnapshot {
  schema_version: typeof CHART_SCHEMA_VERSION;
  classic_result: ChartResult;
  modern_result: ChartResult;
  comparison_result: ComparisonResult;
}
