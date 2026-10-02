/**
 * Teste de cálculo de aspectos de estrelas fixas (CommonJS)
 */
const path = require('path');
const { computeFixedStarAspects } = require(path.join(__dirname, '..', '.tmp-fixed-stars', 'fixed-stars', 'aspects.js'));

const CONFIG = { orbs: { conjunction: 1.0, square: 1.0, opposition: 1.0 } };

const STARS = [
  { id: 'aldebaran', name: 'Aldebaran', constellation: 'Touro', influence: '...', source: '...', longitude: 70.0, latitude: -5.47, longitude_zodiac: "10 Gemini" },
  { id: 'regulus', name: 'Regulus', constellation: 'Leo', influence: '...', source: '...', longitude: 150.0, latitude: 0.47, longitude_zodiac: "00 Virgo" },
];

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) { console.log(`[PASS] ${label}`); passed++; }
  else { console.error(`[FAIL] ${label}`); failed++; }
}

// T1: Conjuncao exata
{
  const aspects = computeFixedStarAspects(STARS, { sun: 70.0 }, CONFIG);
  const c = aspects.find(a => a.star_id === 'aldebaran' && a.planet_key === 'sun' && a.aspect_type === 'conjunction');
  assert(c !== undefined, 'T1a: Conjuncao exata Sol-Aldebaran');
  assert(c?.orb === 0, 'T1b: Orbe = 0');
  assert(c?.applying === null, 'T1c: applying = null');
  assert(c?.orb_status === 'provisional', 'T1d: orb_status provisional');
  assert(c?.aspect_symbol === '☌', 'T1e: Simbolo conjuncao');
}

// T2: Dentro do orbe (0.5 graus)
{
  const aspects = computeFixedStarAspects(STARS, { sun: 70.5 }, CONFIG);
  const c = aspects.find(a => a.star_id === 'aldebaran' && a.planet_key === 'sun' && a.aspect_type === 'conjunction');
  assert(c !== undefined, 'T2: Conjuncao 0.5 detectada');
}

// T3: Fora do orbe (1.5 graus)
{
  const aspects = computeFixedStarAspects(STARS, { sun: 71.5 }, CONFIG);
  const c = aspects.find(a => a.star_id === 'aldebaran' && a.planet_key === 'sun' && a.aspect_type === 'conjunction');
  assert(c === undefined, 'T3: Conjuncao 1.5 graus NAO detectada');
}

// T4: Quadratura
{
  const aspects = computeFixedStarAspects(STARS, { sun: 160.0 }, CONFIG);
  const q = aspects.find(a => a.star_id === 'aldebaran' && a.planet_key === 'sun' && a.aspect_type === 'square');
  assert(q !== undefined, 'T4a: Quadratura detectada');
  assert(q?.aspect_symbol === '□', 'T4b: Simbolo quadratura');
}

// T5: Oposicao
{
  const aspects = computeFixedStarAspects(STARS, { sun: 250.0 }, CONFIG);
  const o = aspects.find(a => a.star_id === 'aldebaran' && a.planet_key === 'sun' && a.aspect_type === 'opposition');
  assert(o !== undefined, 'T5a: Oposicao detectada');
  assert(o?.aspect_symbol === '☍', 'T5b: Simbolo oposicao');
}

// T6: Cruzamento 0/360
{
  const starsEdge = [{ id: 'edge', name: 'Edge', constellation: '', influence: '', source: '', longitude: 359.6, latitude: 0, longitude_zodiac: '' }];
  const aspects = computeFixedStarAspects(starsEdge, { sun: 0.0 }, CONFIG);
  const c = aspects.find(a => a.star_id === 'edge' && a.aspect_type === 'conjunction');
  assert(c !== undefined, 'T6: Conjuncao cruzando 0/360 graus');
}

// T7: ASC deve ser ignorado
{
  const aspects = computeFixedStarAspects(STARS, { sun: 70.0, asc: 70.0 }, CONFIG);
  const ascAsp = aspects.find(a => a.planet_key === 'asc');
  assert(ascAsp === undefined, 'T7: ASC ignorado');
}

console.log(`\nFixed Stars Aspects: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
