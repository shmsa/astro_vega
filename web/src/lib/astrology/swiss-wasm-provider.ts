import type { AstronomyProvider, RawAstronomyBody, RawAstronomyResult } from './astronomy-provider';
import type { Subject } from './contracts';

/**
 * Thin runtime shape used by the adapter. It deliberately mirrors only the
 * @swisseph/browser methods we need, so tests can inject a deterministic fake.
 */
export interface SwissWasmRuntime {
  init(): Promise<void>;
  loadStandardEphemeris(): Promise<void>;
  dateToJulianDay(date: Date): number;
  calculatePosition(jd: number, body: number, flags?: number): {
    longitude: number;
    latitude: number;
    distance: number;
    longitudeSpeed: number;
    latitudeSpeed: number;
    distanceSpeed: number;
    flags: number;
  };
  calculateHouses(jd: number, latitude: number, longitude: number, houseSystem?: string): {
    cusps: number[];
    ascendant: number;
    mc: number;
    armc: number;
    vertex?: number;
    equatorialAscendant?: number;
    coAscendant1?: number;
    coAscendant2?: number;
    polarAscendant?: number;
    houseSystem?: string;
  };
  close?(): void;
}

// Swiss Ephemeris numeric constants, frozen from the public API.
// Keeping them here prevents an accidental enum rename in an upstream wrapper
// from changing the validated astrology profile.
const BODY = Object.freeze({
  Sun: 0,
  Moon: 1,
  Mercury: 2,
  Venus: 3,
  Mars: 4,
  Jupiter: 5,
  Saturn: 6,
  Uranus: 7,
  Neptune: 8,
  Pluto: 9,
  MeanNode: 10,
  MeanApogee: 12,
  Chiron: 15,
});

const FLAG = Object.freeze({
  SwissEphemeris: 2,
  MoshierEphemeris: 4,
  Speed: 256,
  Equatorial: 2048,
});

const HOUSE_SYSTEM_POLICH_PAGE = 'T';

export const VALIDATED_ASTRONOMY_CONSTANTS = Object.freeze({ BODY, FLAG, HOUSE_SYSTEM_POLICH_PAGE });

const MAJOR_BODY_KEYS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;

type MajorBodyKey = (typeof MAJOR_BODY_KEYS)[number];

type RuntimeFactory = () => Promise<SwissWasmRuntime>;

export interface SwissWasmProviderOptions {
  runtimeFactory?: RuntimeFactory;
  /** Load Swiss ephemeris files during init. Required for modern mode + Chiron. */
  preloadSwissFiles?: boolean;
}

function norm360(value: number): number {
  return ((value % 360) + 360) % 360;
}

function signed180(value: number): number {
  const n = norm360(value);
  return n > 180 ? n - 360 : n;
}

function utcDateFromSubject(subject: Subject): Date {
  const [year, month, day] = subject.date.split('-').map(Number);
  const parts = subject.local_time.split(':').map(Number);
  const hour = parts[0] ?? 0;
  const minute = parts[1] ?? 0;
  const second = parts[2] ?? 0;
  const localUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  return new Date(localUtcMs - subject.utc_offset_hours * 3600_000);
}

function isoNoMillis(date: Date): string {
  return date.toISOString().replace('.000Z', '+00:00');
}

function cusps12(raw: number[]): RawAstronomyResult['cusps'] {
  // @swisseph/browser currently documents a 1-based cusp array, but this
  // adapter accepts a zero-based 12-item array too, making it robust to wrappers.
  const c = raw.length >= 13 ? raw.slice(1, 13) : raw.slice(0, 12);
  if (c.length !== 12) throw new Error(`Expected 12 house cusps, got ${c.length}`);
  return c.map(norm360) as RawAstronomyResult['cusps'];
}

async function defaultRuntimeFactory(): Promise<SwissWasmRuntime> {
  // Variable dynamic import intentionally keeps the reference project buildable
  // before dependencies are installed. Production must install @swisseph/browser.
  const moduleName = '@swisseph/browser';
  const mod = await import(moduleName);
  const Runtime = mod.SwissEphemeris;
  if (!Runtime) throw new Error('@swisseph/browser does not export SwissEphemeris');
  return new Runtime() as SwissWasmRuntime;
}

export class SwissWasmAstronomyProvider implements AstronomyProvider {
  readonly providerId = 'swisseph-browser-wasm-v1';
  private readonly runtimeFactory: RuntimeFactory;
  private readonly preloadSwissFiles: boolean;
  private runtimePromise: Promise<SwissWasmRuntime> | null = null;
  private swissFilesPromise: Promise<void> | null = null;

  constructor(options: SwissWasmProviderOptions = {}) {
    this.runtimeFactory = options.runtimeFactory ?? defaultRuntimeFactory;
    this.preloadSwissFiles = options.preloadSwissFiles ?? true;
  }

  private async runtime(): Promise<SwissWasmRuntime> {
    if (!this.runtimePromise) {
      this.runtimePromise = (async () => {
        const runtime = await this.runtimeFactory();
        await runtime.init();
        return runtime;
      })();
    }
    return this.runtimePromise;
  }

  private async ensureSwissFiles(runtime: SwissWasmRuntime): Promise<void> {
    if (!this.swissFilesPromise) {
      this.swissFilesPromise = runtime.loadStandardEphemeris();
    }
    await this.swissFilesPromise;
  }

  private calcBody(
    runtime: SwissWasmRuntime,
    jd: number,
    key: string,
    bodyId: number,
    baseFlag: number,
  ): RawAstronomyBody {
    const ecliptic = runtime.calculatePosition(jd, bodyId, baseFlag | FLAG.Speed);
    const equatorial = runtime.calculatePosition(jd, bodyId, baseFlag | FLAG.Speed | FLAG.Equatorial);
    return {
      key,
      longitude: norm360(ecliptic.longitude),
      declination: equatorial.latitude,
      speed_longitude: ecliptic.longitudeSpeed,
    };
  }

  private calcSharedBodies(
    runtime: SwissWasmRuntime,
    jd: number,
    baseFlag: number,
  ): Record<string, RawAstronomyBody> {
    const bodies: Record<string, RawAstronomyBody> = {};
    for (const key of MAJOR_BODY_KEYS) {
      bodies[key] = this.calcBody(runtime, jd, key, BODY[key as MajorBodyKey], baseFlag);
    }
    bodies.Node = this.calcBody(runtime, jd, 'Node', BODY.MeanNode, baseFlag);
    bodies.Lilith = this.calcBody(runtime, jd, 'Lilith', BODY.MeanApogee, baseFlag);
    return bodies;
  }

  /**
   * Reproduce a houses_armc-style calculation using the public browser API.
   *
   * Polich/Page houses depend on ARMC + latitude + obliquity. The browser wrapper
   * exposes calculateHouses(jd, lat, lon), not houses_armc. We therefore measure
   * Greenwich ARMC at the same JD and choose a synthetic longitude that makes the
   * public routine's ARMC equal the archived/legacy target HSL exactly.
   *
   * This is not an arbitrary offset. It is a coordinate transformation that lets
   * the same Swiss C house routine operate at the validated classic ARMC.
   */
  private housesForTargetArmc(
    runtime: SwissWasmRuntime,
    jd: number,
    latitude: number,
    targetArmcDeg: number,
  ) {
    const greenwich = runtime.calculateHouses(jd, latitude, 0, HOUSE_SYSTEM_POLICH_PAGE);
    const syntheticLongitude = signed180(targetArmcDeg - greenwich.armc);
    const houses = runtime.calculateHouses(jd, latitude, syntheticLongitude, HOUSE_SYSTEM_POLICH_PAGE);
    return { houses, syntheticLongitude, greenwichArmc: norm360(greenwich.armc) };
  }

  private classicGmstHours(jd: number): number {
    const t = (jd - 2451545.0) / 36525.0;
    const gmstDeg = norm360(
      280.46061837
      + 360.98564736629 * (jd - 2451545.0)
      + 0.000387933 * t * t
      - (t * t * t) / 38710000.0,
    );
    return gmstDeg / 15.0;
  }

  async calculateClassic(subject: Subject): Promise<RawAstronomyResult> {
    const runtime = await this.runtime();
    const utc = utcDateFromSubject(subject);
    const jd = runtime.dateToJulianDay(utc);

    // Major planets + mean node + mean apogee use Moshier in Classic.
    const bodies = this.calcSharedBodies(runtime, jd, FLAG.MoshierEphemeris);

    // Chiron does not exist in Moshier. The validated profile requires it, so
    // load Swiss asteroid data explicitly instead of silently omitting it.
    await this.ensureSwissFiles(runtime);
    bodies.Chiron = this.calcBody(runtime, jd, 'Chiron', BODY.Chiron, FLAG.SwissEphemeris);

    const lat = subject.legacy_latitude ?? subject.latitude;
    const lon = subject.legacy_longitude ?? subject.longitude;
    const hslHours = subject.classic_hsl_hours != null
      ? ((subject.classic_hsl_hours % 24) + 24) % 24
      : ((this.classicGmstHours(jd) + lon / 15) % 24 + 24) % 24;
    const targetArmc = norm360(hslHours * 15);
    const { houses, syntheticLongitude, greenwichArmc } = this.housesForTargetArmc(runtime, jd, lat, targetArmc);

    return {
      engineId: 'vega_classic',
      utc: isoNoMillis(utc),
      julianDayUt: jd,
      ascendant: norm360(houses.ascendant),
      midheaven: norm360(houses.mc),
      cusps: cusps12(houses.cusps),
      bodies,
      houseCalculation: {
        mode: 'legacy_armc_via_synthetic_longitude',
        latitude_used: lat,
        longitude_reference: lon,
        hsl_hours: hslHours,
        hsl_source: subject.classic_hsl_hours != null
          ? 'archived_report_override'
          : 'legacy_gmst_formula_plus_longitude',
        armc_degrees: targetArmc,
        greenwich_armc_degrees: greenwichArmc,
        synthetic_longitude_degrees: syntheticLongitude,
        house_system: 'Polich/Page (T)',
        planetary_ephemeris: 'Moshier major bodies; Swiss Chiron',
      },
      warnings: [],
    };
  }

  async calculateModern(subject: Subject): Promise<RawAstronomyResult> {
    const runtime = await this.runtime();
    if (this.preloadSwissFiles) await this.ensureSwissFiles(runtime);
    const utc = utcDateFromSubject(subject);
    const jd = runtime.dateToJulianDay(utc);
    const bodies = this.calcSharedBodies(runtime, jd, FLAG.SwissEphemeris);
    // Chiron is mandatory in the validated profile.
    await this.ensureSwissFiles(runtime);
    bodies.Chiron = this.calcBody(runtime, jd, 'Chiron', BODY.Chiron, FLAG.SwissEphemeris);

    const houses = runtime.calculateHouses(jd, subject.latitude, subject.longitude, HOUSE_SYSTEM_POLICH_PAGE);
    const hslHours = norm360(houses.armc) / 15;
    return {
      engineId: 'modern_swiss',
      utc: isoNoMillis(utc),
      julianDayUt: jd,
      ascendant: norm360(houses.ascendant),
      midheaven: norm360(houses.mc),
      cusps: cusps12(houses.cusps),
      bodies,
      houseCalculation: {
        mode: 'swiss_calculateHouses',
        latitude_used: subject.latitude,
        longitude_used: subject.longitude,
        hsl_hours: hslHours,
        hsl_source: 'Swiss Ephemeris current sidereal-time/house routine',
        armc_degrees: norm360(houses.armc),
        house_system: 'Polich/Page (T)',
        planetary_ephemeris: 'Swiss Ephemeris',
      },
      warnings: [],
    };
  }

  async close(): Promise<void> {
    if (!this.runtimePromise) return;
    const runtime = await this.runtimePromise;
    runtime.close?.();
    this.runtimePromise = null;
    this.swissFilesPromise = null;
  }
}
