/**
 * Real Swiss/Moshier WASM numerical gate test.
 *
 * Ephemeris origin documentation:
 * Swiss Ephemeris data files (sepl_18.se1, semo_18.se1, seas_18.se1) are official Swiss Ephemeris
 * assets hosted at jsdelivr CDN: https://cdn.jsdelivr.net/gh/aloistr/swisseph/ephe/
 * For local testing without network dependency or bundling into public web distribution,
 * files are cached locally in node_modules/.cache/swisseph-ephe/.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 1. Environment bootstrap for Node.js execution of Emscripten WASM module
if (!globalThis.window) {
  globalThis.window = globalThis;
}

const origFetch = globalThis.fetch;
const cacheDir = path.resolve(process.cwd(), 'node_modules', '.cache', 'swisseph-ephe');
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/aloistr/swisseph/ephe';

globalThis.fetch = async (url, opts) => {
  const s = String(url);
  // Serve local wasm file via file:// URL
  if (s.startsWith('file://')) {
    const buf = await fs.readFile(fileURLToPath(s));
    return new Response(buf, { status: 200, headers: { 'Content-Type': 'application/wasm' } });
  }

  // Handle ephemeris data files (.se1)
  const basename = path.basename(s);
  if (basename.endsWith('.se1')) {
    const localCachedPath = path.join(cacheDir, basename);
    try {
      const buf = await fs.readFile(localCachedPath);
      return new Response(buf, { status: 200 });
    } catch {
      // If not yet in cache, fetch from CDN and cache locally
      try {
        const res = await origFetch(`${CDN_BASE}/${basename}`, opts);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          await fs.mkdir(cacheDir, { recursive: true });
          await fs.writeFile(localCachedPath, Buffer.from(ab));
          return new Response(ab, { status: 200 });
        }
      } catch (err) {
        throw new Error(
          `Ephemeris file ${basename} not found in local cache (${localCachedPath}) and CDN fetch failed: ${err.message}`
        );
      }
    }
  }

  return origFetch(url, opts);
};

const ROOT = path.resolve(process.cwd(), '..');
const goldenModern = JSON.parse(await fs.readFile(path.join(ROOT, 'golden', 'sergio_modern.v1.json'), 'utf8'));
const goldenClassic = JSON.parse(await fs.readFile(path.join(ROOT, 'golden', 'sergio_classic.v1.json'), 'utf8'));

let pkg;
try {
  pkg = await import('@swisseph/browser');
} catch (e) {
  console.error('BLOCKED: @swisseph/browser is not installed. Run npm install with network access, then rerun npm run test:wasm-real.');
  process.exit(2);
}

// Compile output is used so this test exercises the exact production adapter.
const providerModule = await import(pathToFileURL(path.join(process.cwd(), '.tmp-real-wasm', 'swiss-wasm-provider.js')));
const { SwissWasmAstronomyProvider } = providerModule;
const provider = new SwissWasmAstronomyProvider({ preloadSwissFiles: true });

const s = goldenModern.subject;
const subject = {
  name: s.name,
  date: s.date,
  local_time: s.local_time,
  utc_offset_hours: s.utc_offset_hours,
  latitude: s.latitude,
  longitude: s.longitude,
  location_name: s.location_name,
  legacy_latitude: s.legacy_latitude,
  legacy_longitude: s.legacy_longitude,
  classic_hsl_hours: s.classic_hsl_hours,
};

const modern = await provider.calculateModern(subject);
const classic = await provider.calculateClassic(subject);

const norm = (x) => ((x % 360) + 360) % 360;
const deltaMin = (actual, expected) => {
  let d = norm(actual - expected);
  if (d > 180) d -= 360;
  return d * 60;
};
const deltaDirectMin = (actual, expected) => (actual - expected) * 60;

const rows = [];
const failures = [];

function check(category, item, expected, actual, deltaArcmin, maxTolerance, extra = {}) {
  const pass = Math.abs(deltaArcmin) <= maxTolerance;
  const row = {
    category,
    item,
    expected: typeof expected === 'number' ? +expected.toFixed(6) : expected,
    actual: typeof actual === 'number' ? +actual.toFixed(6) : actual,
    delta_arcmin: +deltaArcmin.toFixed(4),
    max_tolerance: maxTolerance,
    status: pass ? 'PASS' : 'FAIL',
    ...extra,
  };
  rows.push(row);
  if (!pass) failures.push(row);
}

// 1. Modern Longitudes
for (const [key, p] of Object.entries(goldenModern.points)) {
  if (modern.bodies[key]) {
    const d = deltaMin(modern.bodies[key].longitude, p.longitude);
    check('Modern Longitude', key, p.longitude, modern.bodies[key].longitude, d, 1.1);
  }
}

// 2. Chiron (validated against Python reference using Swiss seas_18.se1)
// Expected Python values: lon 92.497091, dec 16.614300, speed -0.052886, retrograde true
const chironExpectedLon = 92.4970906939;
const chironExpectedDec = 16.6143001214;
if (modern.bodies.Chiron) {
  const dLon = deltaMin(modern.bodies.Chiron.longitude, chironExpectedLon);
  check('Modern Chiron Longitude', 'Chiron', chironExpectedLon, modern.bodies.Chiron.longitude, dLon, 1.1);
  const dDec = deltaDirectMin(modern.bodies.Chiron.declination, chironExpectedDec);
  check('Modern Chiron Declination', 'Chiron', chironExpectedDec, modern.bodies.Chiron.declination, dDec, 1.1);
} else {
  failures.push({ category: 'Chiron', item: 'Chiron', status: 'FAIL', reason: 'Chiron missing in modern bodies' });
}

// 3. Modern Declinations
for (const [key, p] of Object.entries(goldenModern.points)) {
  if (modern.bodies[key]) {
    const d = deltaDirectMin(modern.bodies[key].declination, p.declination);
    check('Modern Declination', key, p.declination, modern.bodies[key].declination, d, 1.1);
  }
}

// 4. Retrograde & Longitude Speed Flags
for (const [key, p] of Object.entries(goldenModern.points)) {
  if (modern.bodies[key]) {
    const actualRetro = modern.bodies[key].speed_longitude < 0;
    const retroMatch = actualRetro === p.retrograde;
    rows.push({
      category: 'Retrograde Flag',
      item: key,
      expected: p.retrograde ? 'R' : 'D',
      actual: actualRetro ? 'R' : 'D',
      delta_arcmin: 0,
      max_tolerance: 0,
      status: retroMatch ? 'PASS' : 'FAIL',
      speed: +modern.bodies[key].speed_longitude.toFixed(6),
    });
    if (!retroMatch) {
      failures.push({ category: 'Retrograde Flag', item: key, expected: p.retrograde, actual: actualRetro });
    }
  }
}
// Chiron retrograde check
if (modern.bodies.Chiron) {
  const chironRetro = modern.bodies.Chiron.speed_longitude < 0;
  rows.push({
    category: 'Retrograde Flag',
    item: 'Chiron',
    expected: 'R',
    actual: chironRetro ? 'R' : 'D',
    delta_arcmin: 0,
    max_tolerance: 0,
    status: chironRetro ? 'PASS' : 'FAIL',
    speed: +modern.bodies.Chiron.speed_longitude.toFixed(6),
  });
  if (!chironRetro) {
    failures.push({ category: 'Retrograde Flag', item: 'Chiron', expected: 'R', actual: 'D' });
  }
}

// 5. Modern 12 Topocentric Cusps
for (let i = 0; i < 12; i++) {
  const d = deltaMin(modern.cusps[i], goldenModern.cusps[i]);
  check('Modern Cusps', `Cusp ${i + 1}`, goldenModern.cusps[i], modern.cusps[i], d, 1.1);
}

// 6. Modern ASC and MC
const modernAscExpected = typeof goldenModern.ascendant === 'number' ? goldenModern.ascendant : goldenModern.ascendant.longitude;
const modernMcExpected = typeof goldenModern.midheaven === 'number' ? goldenModern.midheaven : goldenModern.midheaven.longitude;
check('Modern Angles', 'ASC', modernAscExpected, modern.ascendant, deltaMin(modern.ascendant, modernAscExpected), 1.1);
check('Modern Angles', 'MC', modernMcExpected, modern.midheaven, deltaMin(modern.midheaven, modernMcExpected), 1.1);

// 7. Classic 12 Topocentric Cusps
for (let i = 0; i < 12; i++) {
  const d = deltaMin(classic.cusps[i], goldenClassic.cusps[i]);
  check('Classic Cusps', `Cusp ${i + 1}`, goldenClassic.cusps[i], classic.cusps[i], d, 1.1);
}

// 8. Classic ASC and MC
const classicAscExpected = typeof goldenClassic.ascendant === 'number' ? goldenClassic.ascendant : goldenClassic.ascendant.longitude;
const classicMcExpected = typeof goldenClassic.midheaven === 'number' ? goldenClassic.midheaven : goldenClassic.midheaven.longitude;
check('Classic Angles', 'ASC', classicAscExpected, classic.ascendant, deltaMin(classic.ascendant, classicAscExpected), 1.1);
check('Classic Angles', 'MC', classicMcExpected, classic.midheaven, deltaMin(classic.midheaven, classicMcExpected), 1.1);

// 9. Modern and Classic HSL / ARMC
const modernArmcDelta = deltaMin(modern.houseCalculation.armc_degrees, goldenModern.house_calculation.armc_degrees);
check('Modern ARMC', 'ARMC', goldenModern.house_calculation.armc_degrees, modern.houseCalculation.armc_degrees, modernArmcDelta, 1.1);

const classicArmcDelta = deltaMin(classic.houseCalculation.armc_degrees, goldenClassic.house_calculation.armc_degrees);
check('Classic ARMC', 'ARMC', goldenClassic.house_calculation.armc_degrees, classic.houseCalculation.armc_degrees, classicArmcDelta, 1.1);

const classicHslDelta = (classic.houseCalculation.hsl_hours - goldenClassic.house_calculation.hsl_hours) * 60;
check('Classic HSL', 'HSL (hours)', goldenClassic.house_calculation.hsl_hours, classic.houseCalculation.hsl_hours, classicHslDelta, 1.1);

// 10. Display Rounding Verification (Aries 14°07' / Capricorn 12°05' Modern; Aries 14°05' / Capricorn 12°03' Classic)
const roundArcmin = (deg) => {
  const n = norm(deg);
  const sign = Math.floor(n / 30);
  const rem = n - sign * 30;
  const d = Math.floor(rem);
  const m = Math.round((rem - d) * 60);
  return [sign, d, m];
};
const modernAscRound = roundArcmin(modern.ascendant);
const modernMcRound = roundArcmin(modern.midheaven);
const classicAscRound = roundArcmin(classic.ascendant);
const classicMcRound = roundArcmin(classic.midheaven);

const formatArcmin = ([s, d, m]) => `${d}°${String(m).padStart(2, '0')}' sign ${s}`;
console.log(`Modern Display: ASC = ${formatArcmin(modernAscRound)} (expected 14°07' sign 0), MC = ${formatArcmin(modernMcRound)} (expected 12°05' sign 9)`);
console.log(`Classic Display: ASC = ${formatArcmin(classicAscRound)} (expected 14°05' sign 0), MC = ${formatArcmin(classicMcRound)} (expected 12°03' sign 9)`);

if (modernAscRound[0] !== 0 || modernAscRound[1] !== 14 || modernAscRound[2] !== 7) {
  failures.push({ category: 'Display Rounding', item: 'Modern ASC', actual: modernAscRound });
}
if (modernMcRound[0] !== 9 || modernMcRound[1] !== 12 || modernMcRound[2] !== 5) {
  failures.push({ category: 'Display Rounding', item: 'Modern MC', actual: modernMcRound });
}
if (classicAscRound[0] !== 0 || classicAscRound[1] !== 14 || classicAscRound[2] !== 5) {
  failures.push({ category: 'Display Rounding', item: 'Classic ASC', actual: classicAscRound });
}
if (classicMcRound[0] !== 9 || classicMcRound[1] !== 12 || classicMcRound[2] !== 3) {
  failures.push({ category: 'Display Rounding', item: 'Classic MC', actual: classicMcRound });
}

// Summary and Report Generation
const report = {
  generated_at: new Date().toISOString(),
  profiles: ['vega_classic', 'modern_swiss', 'comparative'],
  ephemeris_source: 'Swiss Ephemeris (sepl_18.se1, semo_18.se1, seas_18.se1) via Alois Treindl / jsdelivr CDN; cached locally in node_modules/.cache/swisseph-ephe/',
  total_checks: rows.length,
  failures_count: failures.length,
  results: rows,
  status: failures.length === 0 ? 'PASS' : 'FAIL',
};

await fs.mkdir(path.join(ROOT, 'validation'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'validation', 'real_wasm_sergio.json'), JSON.stringify(report, null, 2));

console.table(rows.slice(0, 30));
if (rows.length > 30) {
  console.table(rows.slice(30));
}

await provider.close();

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} checks failed in real WASM validation:`, failures);
  process.exit(1);
}

console.log(`PASS: All ${rows.length} real-WASM assertions passed within frozen tolerances!`);
