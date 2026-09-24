const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const profileSource = fs.readFileSync(path.join(root, 'src/lib/astrology/consultation-profiles.ts'), 'utf8');
const providerSource = fs.readFileSync(path.join(root, 'src/lib/astrology/astronomy-provider.ts'), 'utf8');

const required = [
  "id: 'classic'",
  "id: 'modern'",
  "id: 'comparative'",
  "requiredEngines: ['vega_classic']",
  "requiredEngines: ['modern_swiss']",
  "requiredEngines: ['vega_classic', 'modern_swiss']",
];
for (const marker of required) {
  if (!profileSource.includes(marker)) throw new Error(`Missing consultation profile marker: ${marker}`);
}
for (const marker of ['ephemeris: \'moshier\'', 'ephemeris: \'swiss\'', 'polich-page-topocentric', 'mean-node', 'mean-apogee']) {
  if (!providerSource.includes(marker)) throw new Error(`Missing astronomy requirement: ${marker}`);
}
console.log('Three-profile contract suite: 11 assertions passed.');
