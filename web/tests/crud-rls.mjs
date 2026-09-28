import assert from 'node:assert/strict';
import { Pool } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

// Load golden fixtures to use genuine validated chart snapshots
const classicFixture = JSON.parse(fs.readFileSync(path.join(root, 'golden/sergio_classic.v1.json'), 'utf8'));
const modernFixture = JSON.parse(fs.readFileSync(path.join(root, 'golden/sergio_modern.v1.json'), 'utf8'));
const comparisonFixture = JSON.parse(fs.readFileSync(path.join(root, 'golden/sergio_comparison.v1.json'), 'utf8'));

const pool = new Pool({ connectionString: DATABASE_URL });

console.log('=== Neon CRUD & RLS Multi-Tenant Test Suite ===');

async function withTenant(userId, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE test_astro_app_user');
    const claims = JSON.stringify({ sub: userId });
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);
    const res = await fn(client);
    await client.query('COMMIT');
    return res;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function run() {
  const adminClient = await pool.connect();
  let alphaId;
  let betaId;

  try {
    console.log('[1/8] Setting up test role and Alpha/Beta tenants...');
    await adminClient.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'test_astro_app_user') THEN
          CREATE ROLE test_astro_app_user;
        END IF;
      END
      $$;
      GRANT test_astro_app_user TO neondb_owner;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO test_astro_app_user;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO test_astro_app_user;
    `);

    const userRes = await adminClient.query(`
      INSERT INTO neon_auth."user" (name, email, "emailVerified")
      VALUES
        ('Test Alpha Tenant', $1, true),
        ('Test Beta Tenant', $2, true)
      RETURNING id, name;
    `, [`alpha.test.${Date.now()}@astro.local`, `beta.test.${Date.now()}@astro.local`]);

    alphaId = userRes.rows[0].id;
    betaId = userRes.rows[1].id;
    console.log(`  Alpha ID: ${alphaId} | Beta ID: ${betaId}`);

    // [2/8] Practitioner Profile auto-creation & isolation
    console.log('[2/8] Testing Practitioner Profile auto-creation & isolation...');
    await withTenant(alphaId, async (client) => {
      await client.query(`
        INSERT INTO public.practitioner_profiles (user_id, display_name, email)
        VALUES ($1, 'Dr. Alpha Astrologer', 'alpha@astro.local')
        ON CONFLICT (user_id) DO NOTHING;
      `, [alphaId]);
      const p = await client.query(`SELECT * FROM public.practitioner_profiles WHERE user_id = $1`, [alphaId]);
      assert.equal(p.rows.length, 1);
      assert.equal(p.rows[0].display_name, 'Dr. Alpha Astrologer');
    });

    // Beta cannot see Alpha profile under RLS
    await withTenant(betaId, async (client) => {
      const p = await client.query(`SELECT * FROM public.practitioner_profiles WHERE user_id = $1`, [alphaId]);
      assert.equal(p.rows.length, 0, 'Beta must not see Alpha profile');
    });
    console.log('  Practitioner Profile verified: isolated under RLS.');

    // [3/8] Clients CRUD for Alpha
    console.log('[3/8] Testing Clients CRUD for Alpha...');
    let clientId;
    await withTenant(alphaId, async (client) => {
      const ins = await client.query(`
        INSERT INTO public.clients (owner_id, name, email, birth_city, birth_date)
        VALUES ($1, 'Consulente Sergio', 'sergio@example.com', 'Belém', '1989-01-23')
        RETURNING id, name;
      `, [alphaId]);
      clientId = ins.rows[0].id;
      assert.ok(clientId);
      assert.equal(ins.rows[0].name, 'Consulente Sergio');

      // Update client
      const upd = await client.query(`
        UPDATE public.clients SET notes = 'Mapa natal comparativo solicitado'
        WHERE id = $1 AND owner_id = $2
        RETURNING notes;
      `, [clientId, alphaId]);
      assert.equal(upd.rows[0].notes, 'Mapa natal comparativo solicitado');
    });
    console.log(`  Alpha created and updated client ID: ${clientId}`);

    // [4/8] Cross-tenant client access blocked
    console.log('[4/8] Testing Cross-Tenant client access blocked...');
    await withTenant(betaId, async (client) => {
      const read = await client.query(`SELECT * FROM public.clients WHERE id = $1`, [clientId]);
      assert.equal(read.rows.length, 0, 'Beta cannot read Alpha client');

      const upd = await client.query(`
        UPDATE public.clients SET name = 'Hacked' WHERE id = $1 RETURNING *
      `, [clientId]);
      assert.equal(upd.rows.length, 0, 'Beta cannot update Alpha client');

      const del = await client.query(`
        DELETE FROM public.clients WHERE id = $1 RETURNING *
      `, [clientId]);
      assert.equal(del.rows.length, 0, 'Beta cannot delete Alpha client');
    });
    console.log('  Cross-tenant access to clients strictly blocked.');

    // [5/8] Creating Chart with 3 snapshots & composite foreign key
    console.log('[5/8] Testing Chart creation with 3 validated JSONB snapshots...');
    let chartId;
    await withTenant(alphaId, async (client) => {
      const ins = await client.query(`
        INSERT INTO public.charts (
          owner_id, client_id, chart_name, chart_type, profile_key,
          calc_date, calc_time_local, calc_timezone, calc_utc, utc_offset_minutes,
          latitude, longitude, altitude_meters, house_system, zodiac,
          julian_day_utc, classic_result, modern_result, comparison_result,
          calculation_metadata
        ) VALUES (
          $1, $2, 'Mapa Natal Sergio', 'natal', 'comparative',
          '1989-01-23', '10:55:00', 'America/Belem', '1989-01-23T13:55:00Z', -180,
          -1.45, -48.5, 10.0, 'T', 'tropical',
          2447550.07986, $3, $4, $5,
          $6
        ) RETURNING id, chart_name, profile_key;
      `, [
        alphaId, clientId,
        JSON.stringify(classicFixture),
        JSON.stringify(modernFixture),
        JSON.stringify(comparisonFixture),
        JSON.stringify({
          ephemeris_sources: {
            classic: 'moshier_analytical',
            modern: 'swiss_ephemeris_se1',
          },
          chiron_source: 'swiss_ephemeris_se1',
          house_system: 'topocentric_polich_page',
        })
      ]);

      chartId = ins.rows[0].id;
      assert.ok(chartId);
      assert.equal(ins.rows[0].profile_key, 'comparative');
    });
    console.log(`  Chart successfully created with ID: ${chartId}`);

    // [6/8] Cross-tenant chart creation with foreign client blocked (Composite FK)
    console.log('[6/8] Verifying composite FK multi-tenant constraint (Beta using Alpha client)...');
    let foreignClientBlocked = false;
    try {
      await withTenant(betaId, async (client) => {
        await client.query(`
          INSERT INTO public.charts (
            owner_id, client_id, chart_name, chart_type, profile_key,
            calc_date, calc_time_local, calc_timezone, calc_utc, utc_offset_minutes,
            latitude, longitude, altitude_meters, house_system, zodiac,
            julian_day_utc, classic_result, modern_result, comparison_result
          ) VALUES (
            $1, $2, 'Fraudulent Chart', 'natal', 'comparative',
            '1989-01-23', '10:55:00', 'America/Belem', '1989-01-23T13:55:00Z', -180,
            -1.45, -48.5, 10.0, 'T', 'tropical',
            2447550.07986, $3, $4, $5
          );
        `, [
          betaId, clientId,
          JSON.stringify(classicFixture),
          JSON.stringify(modernFixture),
          JSON.stringify(comparisonFixture)
        ]);
      });
    } catch (err) {
      foreignClientBlocked = true;
      assert.ok(err.message.includes('foreign key') || err.message.includes('violates') || err.message.includes('charts_client_owner_fk'));
    }
    assert.ok(foreignClientBlocked, 'Composite FK must prevent Beta from assigning Alpha client');
    console.log('  Composite FK enforcement verified: blocked.');

    // [7/8] Deleting Client preserves Chart with client_id set to NULL
    console.log('[7/8] Testing client deletion with chart preservation (ON DELETE SET NULL)...');
    await withTenant(alphaId, async (client) => {
      await client.query(`DELETE FROM public.clients WHERE id = $1 AND owner_id = $2`, [clientId, alphaId]);
      const ch = await client.query(`SELECT id, client_id, chart_name FROM public.charts WHERE id = $1`, [chartId]);
      assert.equal(ch.rows.length, 1, 'Chart must still exist');
      assert.equal(ch.rows[0].client_id, null, 'Chart client_id must be NULL after client deletion');
    });
    console.log('  Client deletion preserved chart with client_id = NULL.');

    // [8/8] Cascade deletion on user removal
    console.log('[8/8] Testing Cascade deletion when user is deleted from neon_auth."user"...');
    await adminClient.query(`DELETE FROM neon_auth."user" WHERE id = $1`, [alphaId]);
    await adminClient.query(`DELETE FROM neon_auth."user" WHERE id = $1`, [betaId]);

    const remainingCharts = await adminClient.query(`SELECT * FROM public.charts WHERE id = $1`, [chartId]);
    assert.equal(remainingCharts.rows.length, 0, 'Chart must be deleted on user cascade');

    const remainingProfiles = await adminClient.query(`SELECT * FROM public.practitioner_profiles WHERE user_id = $1`, [alphaId]);
    assert.equal(remainingProfiles.rows.length, 0, 'Profile must be deleted on user cascade');
    console.log('  Cascade deletion verified.');

    console.log('=== Neon CRUD & RLS Multi-Tenant Test Suite: ALL 8 PASS ===');
  } finally {
    adminClient.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('CRUD/RLS test error:', err);
  process.exit(1);
});
