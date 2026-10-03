/**
 * Teste de integração do serviço e catálogo de Estrelas Fixas (CommonJS)
 */
const path = require('path');
const { computeFixedStars } = require(path.join(__dirname, '..', '.tmp-fixed-stars', 'fixed-stars', 'service.js'));
const { getAllStars, getStarById, getAllConstellations, CATALOG_SIZE } = require(path.join(__dirname, '..', '.tmp-fixed-stars', 'fixed-stars', 'catalog.js'));

let passed = 0;
let failed = 0;

function assert(cond, label, extra) {
  if (cond) { console.log('[PASS] ' + label + (extra ? ' ' + extra : '')); passed++; }
  else { console.error('[FAIL] ' + label + (extra ? ' ' + extra : '')); failed++; }
}

// 1. Catálogo
assert(CATALOG_SIZE === 50, 'T1: Catalogo contem exatamente 50 estrelas', `(${CATALOG_SIZE})`);
const allStars = getAllStars();
assert(allStars.length === 50, 'T2: getAllStars retorna 50 estrelas');

const aldebaran = getStarById('aldebaran');
assert(aldebaran !== undefined, 'T3: Aldebaran encontrado no catalogo');
assert(aldebaran?.constellation === 'Touro', 'T4: Constelacao de Aldebaran e Touro');
assert(aldebaran?.designation === 'alTau', 'T5: Designacao alTau');

const consts = getAllConstellations();
assert(consts.length > 10, 'T6: Constelacoes carregadas', `(${consts.length} constelacoes)`);

// 2. Cálculo completo com mapa de Rommel
const planets = {
  sun: 303.88,
  moon: 137.94,
  mercury: 298.12,
  venus: 279.35,
  mars: 36.31,
  jupiter: 69.80,
  saturn: 278.43,
  uranus: 273.18,
  neptune: 281.04,
  pluto: 224.89
};

const result = computeFixedStars(2447550.0799, planets);

assert(result.stars.length === 50, 'T7: 50 estrelas calculadas no resultado');
assert(result.epoch_year > 1989 && result.epoch_year < 1989.1, 'T8: Epoca ~1989', `(${result.epoch_year})`);
assert(result.module_version === '1.0.0', 'T9: Versao 1.0.0');
assert(result.calculation_method === 'Vega-style IAU1976 reconstruction', 'T9b: calculation_method = Vega-style IAU1976 reconstruction');

// Aldebaran no resultado
const rAldebaran = result.stars.find(s => s.id === 'aldebaran');
assert(rAldebaran !== undefined, 'T10: Aldebaran presente nas estrelas precessadas');
assert(rAldebaran?.status === 'vega_confirmed', 'T10b: Aldebaran status = vega_confirmed');
assert(typeof rAldebaran?.longitude === 'number', 'T11: Longitude numerica calculada');
assert(rAldebaran?.longitude_zodiac.includes('Gêmeos'), 'T12: Longitude zodiacal contem Gemeos', `(${rAldebaran?.longitude_zodiac})`);

// Aspecto Júpiter-Aldebaran
const jupAldebaran = result.aspects.find(a => a.star_id === 'aldebaran' && a.planet_key === 'jupiter');
assert(jupAldebaran !== undefined, 'T13: Conjuncao Jupiter-Aldebaran detectada', `(orbe=${jupAldebaran?.orb}°)`);
assert(jupAldebaran?.aspect_type === 'conjunction', 'T14: Tipo de aspecto e conjuncao');
assert(jupAldebaran?.aspect_symbol === '☌', 'T15: Simbolo de aspecto e ☌');

// Aspectos ordenados por orbe
for (let i = 1; i < result.aspects.length; i++) {
  assert(result.aspects[i].orb >= result.aspects[i - 1].orb, 'T16: Aspectos ordenados por orbe crescente');
  break;
}

console.log(`\nFixed Stars API & Service: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
