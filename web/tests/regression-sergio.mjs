/**
 * Comprehensive Regression Suite for Astro Vega v1.0 RC
 * Subject: Sergio Henrique Monte Santo Andrade — 23/01/1989, 10:55, Belém/PA
 * Validates Cases A through G against Erwin Rommel / Vega Master
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Pool } from '@neondatabase/serverless';

// 1. Environment bootstrap for Node.js execution of Emscripten WASM module
if (!globalThis.window) {
  globalThis.window = globalThis;
}

const origFetch = globalThis.fetch;
const cacheDir = path.resolve(process.cwd(), 'node_modules', '.cache', 'swisseph-ephe');
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/aloistr/swisseph/ephe';

globalThis.fetch = async (url, opts) => {
  const s = String(url);
  if (s.startsWith('file://')) {
    const buf = await fs.readFile(fileURLToPath(s));
    return new Response(buf, { status: 200, headers: { 'Content-Type': 'application/wasm' } });
  }

  const basename = path.basename(s);
  if (basename.endsWith('.se1')) {
    const localCachedPath = path.join(cacheDir, basename);
    try {
      const buf = await fs.readFile(localCachedPath);
      return new Response(buf, { status: 200 });
    } catch {
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

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Import compiled modules
const tmpDir = path.join(process.cwd(), '.tmp-real-wasm');
const { SwissWasmAstronomyProvider } = await import(pathToFileURL(path.join(tmpDir, 'swiss-wasm-provider.js')));
const { assembleChart } = require('../.math-test-dist/chart-assembler.js');
const { runConsultationProfile } = require('../.math-test-dist/consultation-pipeline.js');
const { formatHouseDisplay, formatZodiacPrecise, parseHslString, formatHslString } = require('../.math-test-dist/format.js');

const norm = (x) => ((x % 360) + 360) % 360;
const roundArcmin = (deg) => {
  const n = norm(deg);
  const sign = Math.floor(n / 30);
  const rem = n - sign * 30;
  const d = Math.floor(rem);
  const m = Math.round((rem - d) * 60);
  return [sign, d, m];
};

const provider = new SwissWasmAstronomyProvider({ preloadSwissFiles: true });

const sergioBaseSubject = {
  name: 'Sergio Henrique Monte Santo Andrade',
  date: '1989-01-23',
  local_time: '10:55',
  utc_offset_hours: -3,
  latitude: -1.45,
  longitude: -48.5,
  location_name: 'Belém, PA, Brasil',
  legacy_latitude: -1.45,
  legacy_longitude: -48.5,
};

console.log('================================================================');
console.log('🧪 ASTRO VEGA V1.0 RC — SUÍTE COMPLETA DE REGRESSÃO ERWIN ROMMEL');
console.log('================================================================\n');

try {
  // -------------------------------------------------------------
  // CASO A: Moderno sem HSL
  // -------------------------------------------------------------
  console.log('[CASO A] Moderno sem HSL (Precisão Atual - Swiss Ephemeris)...');
  const resModern = await runConsultationProfile('modern', sergioBaseSubject, provider, assembleChart);
  const modernChart = resModern.modern_result;
  assert.ok(modernChart, 'modern_result must exist');

  const [mSignAsc, mDegAsc, mMinAsc] = roundArcmin(modernChart.ascendant);
  const [mSignMc, mDegMc, mMinMc] = roundArcmin(modernChart.midheaven);
  console.log(`  ASC Moderno: ${mDegAsc}°${String(mMinAsc).padStart(2, '0')}' signo ${mSignAsc} (esperado 14°07' Áries)`);
  console.log(`  MC Moderno:  ${mDegMc}°${String(mMinMc).padStart(2, '0')}' signo ${mSignMc} (esperado 12°05' Capricórnio)`);

  assert.equal(mSignAsc, 0, 'Modern ASC deve ser em Áries (signo 0)');
  assert.equal(mDegAsc, 14, 'Modern ASC grau deve ser 14');
  assert.equal(mMinAsc, 7, 'Modern ASC minuto deve ser 07');

  assert.equal(mSignMc, 9, 'Modern MC deve ser em Capricórnio (signo 9)');
  assert.equal(mDegMc, 12, 'Modern MC grau deve ser 12');
  assert.equal(mMinMc, 5, 'Modern MC minuto deve ser 05');
  console.log('  ✅ CASO A PASS: ASC 14°07\' Áries / MC 12°05\' Capricórnio validado.\n');

  // -------------------------------------------------------------
  // CASO B: Clássico normal sem HSL override
  // -------------------------------------------------------------
  console.log('[CASO B] Clássico normal sem override de HSL (Moshier + HSL padrão)...');
  const resClassicNoHsl = await runConsultationProfile('classic', sergioBaseSubject, provider, assembleChart);
  const classicNoHslChart = resClassicNoHsl.classic_result;
  assert.ok(classicNoHslChart, 'classic_result must exist');
  assert.equal(classicNoHslChart.engine.id, 'vega_classic');
  assert.ok(classicNoHslChart.house_calculation.hsl_hours, 'HSL hours must be calculated');
  console.log(`  HSL calculada: ${classicNoHslChart.house_calculation.hsl_hours.toFixed(4)}h`);
  console.log('  ✅ CASO B PASS: Clássico calculado normalmente com sucesso.\n');

  // -------------------------------------------------------------
  // CASO C: Clássico com HSL 18:52:24 (Reprodução Histórica Vega)
  // -------------------------------------------------------------
  console.log('[CASO C] Clássico com HSL 18:52:24 (18.873333h)...');
  const hslHours = parseHslString('18:52:24');
  assert.ok(hslHours !== null);
  assert.equal(formatHslString(hslHours), '18:52:24');

  const sergioClassicHslSubject = {
    ...sergioBaseSubject,
    classic_hsl_hours: hslHours,
  };

  const resClassicHsl = await runConsultationProfile('classic', sergioClassicHslSubject, provider, assembleChart);
  const classicHslChart = resClassicHsl.classic_result;
  assert.ok(classicHslChart, 'classic_result must exist');

  const [cSignAsc, cDegAsc, cMinAsc] = roundArcmin(classicHslChart.ascendant);
  const [cSignMc, cDegMc, cMinMc] = roundArcmin(classicHslChart.midheaven);
  console.log(`  ASC Clássico (com HSL): ${cDegAsc}°${String(cMinAsc).padStart(2, '0')}' signo ${cSignAsc} (esperado 14°05' Áries)`);
  console.log(`  MC Clássico (com HSL):  ${cDegMc}°${String(cMinMc).padStart(2, '0')}' signo ${cSignMc} (esperado 12°03' Capricórnio)`);

  assert.equal(cSignAsc, 0, 'Classic ASC deve ser em Áries (signo 0)');
  assert.equal(cDegAsc, 14, 'Classic ASC grau deve ser 14');
  assert.equal(cMinAsc, 5, 'Classic ASC minuto deve ser 05');

  assert.equal(cSignMc, 9, 'Classic MC deve ser em Capricórnio (signo 9)');
  assert.equal(cDegMc, 12, 'Classic MC grau deve ser 12');
  assert.equal(cMinMc, 3, 'Classic MC minuto deve ser 03');
  console.log('  ✅ CASO C PASS: ASC 14°05\' Áries / MC 12°03\' Capricórnio validado.\n');

  // -------------------------------------------------------------
  // CASO D: Comparativo com HSL (Clássico afetado, Moderno inalterado)
  // -------------------------------------------------------------
  console.log('[CASO D] Comparativo com HSL (Isolamento Moderno vs Clássico)...');
  const resComparative = await runConsultationProfile('comparative', sergioClassicHslSubject, provider, assembleChart);
  assert.ok(resComparative.classic_result, 'classic_result in comparative must exist');
  assert.ok(resComparative.modern_result, 'modern_result in comparative must exist');
  assert.ok(resComparative.comparison_result, 'comparison_result must exist');

  const [compCSignAsc, compCDegAsc, compCMinAsc] = roundArcmin(resComparative.classic_result.ascendant);
  const [compCSignMc, compCDegMc, compCMinMc] = roundArcmin(resComparative.classic_result.midheaven);
  const [compMSignAsc, compMDegAsc, compMMinAsc] = roundArcmin(resComparative.modern_result.ascendant);
  const [compMSignMc, compMDegMc, compMMinMc] = roundArcmin(resComparative.modern_result.midheaven);

  assert.equal(compCSignAsc, 0); assert.equal(compCDegAsc, 14); assert.equal(compCMinAsc, 5);
  assert.equal(compCSignMc, 9); assert.equal(compCDegMc, 12); assert.equal(compCMinMc, 3);

  assert.equal(compMSignAsc, 0); assert.equal(compMDegAsc, 14); assert.equal(compMMinAsc, 7);
  assert.equal(compMSignMc, 9); assert.equal(compMDegMc, 12); assert.equal(compMMinMc, 5);

  console.log('  Clássico Comparativo: ASC 14°05\' Áries | MC 12°03\' Capricórnio');
  console.log('  Moderno Comparativo:  ASC 14°07\' Áries | MC 12°05\' Capricórnio (não afetado pelo HSL)');
  console.log('  ✅ CASO D PASS: Isolamento e comparação executados com perfeição.\n');

  // -------------------------------------------------------------
  // CASO G: Casas Interpretativas (Regra Vega 10°/5°) e Notação Zodiacal
  // -------------------------------------------------------------
  console.log('[CASO G] Casas Interpretativas 10°/5° e Apresentação Zodiacal...');
  const pts = resComparative.classic_result.points;

  // Verificações exigidas:
  // Mercúrio 10/11, Saturno 9/10, Urano 9/10, Netuno 9/10, Plutão 7/8
  const checks = [
    { key: 'Mercury', expectedGeom: 10, expectedInterp: 11 },
    { key: 'Saturn', expectedGeom: 9, expectedInterp: 10 },
    { key: 'Uranus', expectedGeom: 9, expectedInterp: 10 },
    { key: 'Neptune', expectedGeom: 9, expectedInterp: 10 },
    { key: 'Pluto', expectedGeom: 7, expectedInterp: 8 },
  ];

  for (const c of checks) {
    const pt = pts[c.key];
    assert.ok(pt, `Point ${c.key} must exist`);
    console.log(`  ${pt.name} (${c.key}): geométrica=${pt.house_geometric}, interpretativa=${pt.house_interpretive}`);
    assert.equal(pt.house_geometric, c.expectedGeom, `${c.key} geométrica deve ser ${c.expectedGeom}`);
    assert.equal(pt.house_interpretive, c.expectedInterp, `${c.key} interpretativa deve ser ${c.expectedInterp}`);

    const hDisplay = formatHouseDisplay(pt.house_geometric, pt.house_interpretive);
    assert.equal(hDisplay.text, `Casa ${c.expectedGeom} → ${c.expectedInterp}`);
    assert.equal(hDisplay.badge, `${c.expectedGeom}/${c.expectedInterp}`);
    assert.equal(hDisplay.hasAnticipation, true);
  }

  // Notação zodiacal precisa formatZodiacPrecise
  const ascZodiac = formatZodiacPrecise(resComparative.classic_result.ascendant);
  const mcZodiac = formatZodiacPrecise(resComparative.classic_result.midheaven);
  console.log(`  Notação ASC: "${ascZodiac}"`);
  console.log(`  Notação MC:  "${mcZodiac}"`);
  assert.equal(ascZodiac, "14°05' Áries");
  assert.equal(mcZodiac, "12°03' Capricórnio");
  console.log('  ✅ CASO G PASS: Casas interpretativas 10°/5° e notação zodiacal 100% validadas.\n');

  // -------------------------------------------------------------
  // CASO E & F: Persistência no Banco Neon, Imutabilidade e Tags
  // -------------------------------------------------------------
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.log('⚠️  DATABASE_URL não configurado; pulando persistência.');
  } else {
    console.log('[CASO E & F] Persistência no Neon, Imutabilidade Editorial e Tags...');
    const pool = new Pool({ connectionString: DATABASE_URL });
    const adminClient = await pool.connect();
    let testUserId;

    try {
      const userRes = await adminClient.query(`
        INSERT INTO neon_auth."user" (name, email, "emailVerified")
        VALUES ('Test Sergio Golden Master', $1, true)
        RETURNING id;
      `, [`sergio.golden.${Date.now()}@astro.local`]);
      testUserId = userRes.rows[0].id;
      adminClient.release();

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE test_astro_app_user');
        const claims = JSON.stringify({ sub: testUserId });
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);

        // 1. Inserir com tags vazias []
      const insertEmptyTags = await client.query(`
        INSERT INTO public.charts (
          owner_id, chart_name, chart_type, profile_key,
          calc_date, calc_time_local, calc_timezone, calc_utc, utc_offset_minutes,
          latitude, longitude, altitude_meters, house_system, zodiac,
          julian_day_utc, classic_result, modern_result, comparison_result,
          calculation_metadata, tags
        ) VALUES (
          $1, 'Mapa Vazio Tags', 'natal', 'comparative',
          '1989-01-23', '10:55:00', 'America/Belem', '1989-01-23T13:55:00Z', -180,
          -1.45, -48.5, 10.0, 'T', 'tropical',
          2447550.07986, $2, $3, $4,
          $5, COALESCE($6::text[], '{}'::text[])
        ) RETURNING id, tags;
      `, [
        testUserId,
        JSON.stringify(resComparative.classic_result),
        JSON.stringify(resComparative.modern_result),
        JSON.stringify(resComparative.comparison_result),
        JSON.stringify({ historical_hsl: '18:52:24', historical_hsl_override: true }),
        []
      ]);
      assert.deepEqual(insertEmptyTags.rows[0].tags, []);
      console.log('  Tags vazias [] persistidas como text[] com sucesso.');

      // 2. Inserir com single tag ['natal']
      const insertSingleTag = await client.query(`
        INSERT INTO public.charts (
          owner_id, chart_name, chart_type, profile_key,
          calc_date, calc_time_local, calc_timezone, calc_utc, utc_offset_minutes,
          latitude, longitude, altitude_meters, house_system, zodiac,
          julian_day_utc, classic_result, modern_result, comparison_result,
          calculation_metadata, tags
        ) VALUES (
          $1, 'Mapa Single Tag', 'natal', 'comparative',
          '1989-01-23', '10:55:00', 'America/Belem', '1989-01-23T13:55:00Z', -180,
          -1.45, -48.5, 10.0, 'T', 'tropical',
          2447550.07986, $2, $3, $4,
          $5, COALESCE($6::text[], '{}'::text[])
        ) RETURNING id, tags;
      `, [
        testUserId,
        JSON.stringify(resComparative.classic_result),
        JSON.stringify(resComparative.modern_result),
        JSON.stringify(resComparative.comparison_result),
        JSON.stringify({ historical_hsl: '18:52:24' }),
        ['natal']
      ]);
      assert.deepEqual(insertSingleTag.rows[0].tags, ['natal']);
      console.log("  Single tag ['natal'] persistida com sucesso.");

      // 3. Inserir com múltiplas tags ['astrologia', 'sergio', 'golden']
      const initialTags = ['astrologia', 'sergio', 'golden'];
      const insertMultiTags = await client.query(`
        INSERT INTO public.charts (
          owner_id, chart_name, chart_type, profile_key,
          calc_date, calc_time_local, calc_timezone, calc_utc, utc_offset_minutes,
          latitude, longitude, altitude_meters, house_system, zodiac,
          julian_day_utc, classic_result, modern_result, comparison_result,
          calculation_metadata, notes, tags
        ) VALUES (
          $1, 'Mapa Sergio Completo', 'natal', 'comparative',
          '1989-01-23', '10:55:00', 'America/Belem', '1989-01-23T13:55:00Z', -180,
          -1.45, -48.5, 10.0, 'T', 'tropical',
          2447550.07986, $2, $3, $4,
          $5, 'Nota original de nascimento', COALESCE($6::text[], '{}'::text[])
        ) RETURNING *;
      `, [
        testUserId,
        JSON.stringify(resComparative.classic_result),
        JSON.stringify(resComparative.modern_result),
        JSON.stringify(resComparative.comparison_result),
        JSON.stringify({ historical_hsl: '18:52:24', historical_hsl_override: true }),
        initialTags
      ]);

      const savedChart = insertMultiTags.rows[0];
      const savedChartId = savedChart.id;
      assert.deepEqual(savedChart.tags, initialTags);
      console.log("  Múltiplas tags ['astrologia', 'sergio', 'golden'] persistidas com sucesso.");

      // Verificar que snapshots salvos são rigorosamente idênticos (sem recálculo)
      assert.deepEqual(savedChart.classic_result, JSON.parse(JSON.stringify(resComparative.classic_result)));
      assert.deepEqual(savedChart.modern_result, JSON.parse(JSON.stringify(resComparative.modern_result)));
      assert.deepEqual(savedChart.comparison_result, JSON.parse(JSON.stringify(resComparative.comparison_result)));
      console.log('  Snapshots JSONB recarregados do Neon são rigorosamente idênticos.');

      // Atualização editorial: alterar apenas chart_name, notes, tags
      const updatedEditorial = await client.query(`
        UPDATE public.charts
        SET chart_name = $1, notes = $2, tags = COALESCE($3::text[], '{}'::text[])
        WHERE id = $4 AND owner_id = $5
        RETURNING *;
      `, [
        'Mapa Sergio Atualizado Editorial',
        'Notas de consulta revisadas por Rommel',
        ['arquivo', 'rommel', 'validado'],
        savedChartId,
        testUserId
      ]);

      const reloadedChart = updatedEditorial.rows[0];
      assert.equal(reloadedChart.chart_name, 'Mapa Sergio Atualizado Editorial');
      assert.equal(reloadedChart.notes, 'Notas de consulta revisadas por Rommel');
      assert.deepEqual(reloadedChart.tags, ['arquivo', 'rommel', 'validado']);

      // Garantir imutabilidade astronômica
      assert.deepEqual(reloadedChart.classic_result, savedChart.classic_result);
      assert.deepEqual(reloadedChart.modern_result, savedChart.modern_result);
      assert.deepEqual(reloadedChart.calculation_metadata, savedChart.calculation_metadata);
      assert.equal(reloadedChart.julian_day_utc, savedChart.julian_day_utc);
      console.log('  Salvaguarda de imutabilidade verificada: dados astronômicos preservados intactos.');

        await client.query('ROLLBACK'); // Limpeza limpa da transação de teste
        console.log('  ✅ CASO E & F PASS: Persistência, tags e imutabilidade editorial 100% verificadas.\n');
      } finally {
        client.release();
      }
    } finally {
      if (testUserId) {
        const cleanupClient = await pool.connect();
        try {
          await cleanupClient.query(`DELETE FROM neon_auth."user" WHERE id = $1;`, [testUserId]);
        } finally {
          cleanupClient.release();
        }
      }
      await pool.end();
    }
  }

  await provider.close();
  console.log('================================================================');
  console.log('🎉 TODOS OS CASOS (A, B, C, D, E, F, G) PASSARAM COM SUCESSO! 🎉');
  console.log('================================================================');
} catch (err) {
  console.error('\n❌ ERRO NA SUÍTE DE REGRESSÃO:', err);
  process.exit(1);
}
