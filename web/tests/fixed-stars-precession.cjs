/**
 * Teste de precessão IAU 1976 (CommonJS)
 */
const path = require('path');
const { precessToDate, jdToEpochYear } = require(path.join(__dirname, '..', '.tmp-fixed-stars', 'fixed-stars', 'precession.js'));

let passed = 0;
let failed = 0;

function assert(cond, label, extra) {
  if (cond) { console.log('[PASS] ' + label + (extra ? ' ' + extra : '')); passed++; }
  else { console.error('[FAIL] ' + label + (extra ? ' ' + extra : '')); failed++; }
}

const JD_J2000 = 2451545.0;
const JD_1989 = 2447550.0799;

// T1: J2000
{
  const { longitude } = precessToDate(68.98, 16.5093, JD_J2000);
  const expected = 69.789;
  const delta = Math.abs(longitude - expected);
  assert(delta < 0.005, 'T1: Aldebaran J2000 lon=J2000.0 ecliptica', `(${longitude.toFixed(4)} vs ${expected}, delta=${(delta*3600).toFixed(1)}")`);
}

// T2: Monotonicidade
{
  const lon1950 = precessToDate(68.98, 16.5093, 2433282.5).longitude;
  const lon1989 = precessToDate(68.98, 16.5093, JD_1989).longitude;
  const lon2000 = precessToDate(68.98, 16.5093, JD_J2000).longitude;
  const lon2026 = precessToDate(68.98, 16.5093, 2461041.5).longitude;
  assert(lon1950 < lon1989, 'T2a: lon@1950 < lon@1989 (precessao crescente)');
  assert(lon1989 < lon2000, 'T2b: lon@1989 < lon@J2000');
  assert(lon2000 < lon2026, 'T2c: lon@J2000 < lon@2026');
}

// T3: Taxa de precessao ~50.3 arcsec/ano
{
  const lon1950 = precessToDate(68.98, 16.5093, 2433282.5).longitude;
  const lon2050 = precessToDate(68.98, 16.5093, 2469807.5).longitude;
  const deltaLon = lon2050 - lon1950;
  const rate100yr = 100 * 50.29 / 3600;
  const rateErr = Math.abs(deltaLon - rate100yr);
  assert(rateErr < 0.05, 'T3: Taxa precessao ~1.40 grau/100 anos');
}

// T4: Casos de referencia fixos
const REGRESSION = [
  ['Aldebaran@1989', 68.98, 16.5093, JD_1989, 69.6362],
  ['Aldebaran@J2000', 68.98, 16.5093, JD_J2000, 69.7890],
  ['Regulus@1989', 152.093, 11.9672, JD_1989, 149.6764],
  ['Regulus@J2000', 152.093, 11.9672, JD_J2000, 149.8292],
  ['Antares@1989', 247.3519, -26.432, JD_1989, 249.6095],
  ['Antares@J2000', 247.3519, -26.432, JD_J2000, 249.7623],
  ['Sirius@1989', 101.2872, -16.7161, JD_1989, 103.9289],
  ['Sirius@J2000', 101.2872, -16.7161, JD_J2000, 104.0817],
  ['Spica@1989', 201.2983, -11.1614, JD_1989, 203.6886],
  ['Spica@J2000', 201.2983, -11.1614, JD_J2000, 203.8414],
];

const REG_TOLERANCE = 0.0001;
for (const [label, ra, dec, jd, expected] of REGRESSION) {
  const { longitude } = precessToDate(ra, dec, jd);
  const delta = Math.abs(longitude - expected);
  assert(delta < REG_TOLERANCE, 'T4-' + label, `(${longitude.toFixed(4)} vs ${expected.toFixed(4)}, delta=${(delta*3600).toFixed(2)}")`);
}

// T5: jdToEpochYear
{
  const epoch = jdToEpochYear(JD_J2000);
  assert(Math.abs(epoch - 2000.0) < 0.001, 'T5a: jdToEpochYear(J2000)=2000.0');
  const epoch1989 = jdToEpochYear(JD_1989);
  assert(Math.abs(epoch1989 - 1989.06) < 0.01, 'T5b: jdToEpochYear(Rommel JD)~1989.06');
}

console.log('\nFixed Stars Precession: ' + passed + '/' + (passed + failed) + ' passed');
if (failed > 0) process.exit(1);
