import { Pool, PoolClient } from '@neondatabase/serverless';

let poolInstance: Pool | null = null;

export function getDbPool(): Pool {
  if (!poolInstance) {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set in environment.');
    }
    // Clean surrounding quotes if passed by deployment environments
    connectionString = connectionString.trim().replace(/^["']|["']$/g, '');
    poolInstance = new Pool({ connectionString });
  }
  return poolInstance;
}

/**
 * Executes a callback within a scoped database transaction setting the
 * RLS identity via `request.jwt.claims` for defence-in-depth,
 * compatible with `(SELECT auth.user_id())::uuid = owner_id`.
 */
export async function withAuthenticatedTenant<T>(
  userId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Set the JWT claims GUC parameter so auth.user_id() evaluates to userId
    const claimsJson = JSON.stringify({ sub: userId });
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claimsJson]);

    const result = await callback(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
