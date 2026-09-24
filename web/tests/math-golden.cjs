const fs = require('fs');
const path = require('path');
const math = require('../.math-test-dist/math.js');

const root = path.resolve(__dirname, '../..');
const classic = JSON.parse(fs.readFileSync(path.join(root, 'golden/sergio_classic.v1.json'), 'utf8'));
const modern = JSON.parse(fs.readFileSync(path.join(root, 'golden/sergio_modern.v1.json'), 'utf8'));
const expectedComparison = JSON.parse(fs.readFileSync(path.join(root, 'golden/sergio_comparison.v1.json'), 'utf8'));

let assertions = 0;
function assert(condition, message) {
  assertions += 1;
  if (!condition) throw new Error(message);
}
function approx(actual, expected, tolerance, message) {
  assert(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
}
function sameJson(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}\nexpected=${JSON.stringify(expected)}\nactual=${JSON.stringify(actual)}`);
}

assert(math.norm360(-1) === 359, 'norm360 wraps negative values');
assert(math.norm360(721) === 1, 'norm360 wraps values over 360');
assert(math.angularDistance(359, 1) === 2, 'angularDistance crosses zero correctly');
assert(math.signedAngularDelta(359, 1) === 2, 'signedAngularDelta crosses zero correctly');

sameJson(math.roundArcminute(classic.points.Sun.longitude), [10, 3, 33], 'Sun minute rounding');
assert(math.formatZodiac(classic.points.Mercury.longitude, true) === "06°47' Aquário R", 'Portuguese zodiac formatting');

const fortune = math.partOfFortune(classic.points.ASC.longitude, classic.points.Moon.longitude, classic.points.Sun.longitude);
approx(fortune, classic.points.Fortune.longitude, 1e-10, 'Part of Fortune');
assert(math.lunarPhase(classic.points.Sun.longitude, classic.points.Moon.longitude) === classic.lunar_phase, 'Lunar phase');

for (const [key, point] of Object.entries(classic.points)) {
  const house = math.findHouse(point.longitude, classic.cusps);
  assert(house === point.house_geometric, `${key} geometric house`);
  const interpretive = math.interpretiveHouse(point.longitude, house, classic.cusps);
  assert(interpretive === point.house_interpretive, `${key} interpretive house`);
}

sameJson(math.scoreDistribution(classic.points), classic.scores, 'Score distribution');

const order = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Node','Lilith','Chiron','ASC','MC','Fortune']
  .filter((key) => classic.points[key]);
const aspectKey = (a) => `${a.a}|${a.b}|${a.type}`;
const tsAspects = math.calculateAspects(classic.points, order).map(aspectKey).sort();
const pyAspects = classic.aspects.map(aspectKey).sort();
sameJson(tsAspects, pyAspects, 'Aspect set');

const decKey = (a) => `${a.a}|${a.b}|${a.type}`;
const tsDecl = math.calculateDeclinationAspects(classic.points, order).map(decKey).sort();
const pyDecl = classic.declination_aspects.map(decKey).sort();
sameJson(tsDecl, pyDecl, 'Declination aspect set');

const comparison = math.compareChartsPure(classic, modern);
assert(comparison.scores_equal === expectedComparison.scores_equal, 'Comparison score equality');
assert(comparison.lunar_phase_equal === expectedComparison.lunar_phase_equal, 'Comparison lunar phase equality');
sameJson(comparison.aspect_changes, expectedComparison.aspect_changes, 'Comparison aspect changes');
for (const [key, point] of Object.entries(expectedComparison.points)) {
  approx(comparison.points[key].delta_arcminutes, point.delta_arcminutes, 1e-9, `${key} comparison delta`);
  assert(comparison.points[key].same_display_minute === point.same_display_minute, `${key} display-minute equality`);
}
for (let i = 0; i < expectedComparison.cusps.length; i += 1) {
  approx(comparison.cusps[i].delta_arcminutes, expectedComparison.cusps[i].delta_arcminutes, 1e-9, `Cusp ${i + 1} delta`);
}

console.log(`TypeScript pure-math golden suite: ${assertions} assertions passed.`);
