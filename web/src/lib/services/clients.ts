import { PoolClient } from '@neondatabase/serverless';
import { withAuthenticatedTenant } from '@/lib/db';

export interface ClientRecord {
  id: string;
  owner_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  gender: 'male' | 'female' | 'other' | 'unknown' | null;
  birth_date: string | null;
  birth_time_local: string | null;
  birth_timezone: string | null;
  birth_city: string | null;
  birth_state_code: string | null;
  birth_country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude_meters: number;
  created_at: string;
  updated_at: string;
}

export type CreateClientInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  gender?: 'male' | 'female' | 'other' | 'unknown' | null;
  birth_date?: string | null;
  birth_time_local?: string | null;
  birth_timezone?: string | null;
  birth_city?: string | null;
  birth_state_code?: string | null;
  birth_country_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  altitude_meters?: number;
};

export type UpdateClientInput = Partial<CreateClientInput>;

export async function createClient(
  userId: string,
  input: CreateClientInput
): Promise<ClientRecord> {
  if (!input.name || input.name.trim() === '') {
    throw new Error('Nome do consulente é obrigatório.');
  }

  return withAuthenticatedTenant(userId, async (client: PoolClient) => {
    const res = await client.query<ClientRecord>(
      `INSERT INTO public.clients (
        owner_id, name, email, phone, notes, gender,
        birth_date, birth_time_local, birth_timezone, birth_city,
        birth_state_code, birth_country_code, latitude, longitude, altitude_meters
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, COALESCE($15, 0.0)
      ) RETURNING *`,
      [
        userId,
        input.name.trim(),
        input.email ?? null,
        input.phone ?? null,
        input.notes ?? null,
        input.gender ?? null,
        input.birth_date ?? null,
        input.birth_time_local ?? null,
        input.birth_timezone ?? null,
        input.birth_city ?? null,
        input.birth_state_code ?? null,
        input.birth_country_code ?? null,
        input.latitude ?? null,
        input.longitude ?? null,
        input.altitude_meters ?? 0.0,
      ]
    );
    return res.rows[0];
  });
}

export async function listClients(userId: string): Promise<ClientRecord[]> {
  return withAuthenticatedTenant(userId, async (client: PoolClient) => {
    const res = await client.query<ClientRecord>(
      `SELECT * FROM public.clients WHERE owner_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  });
}

export async function getClientById(
  userId: string,
  clientId: string
): Promise<ClientRecord | null> {
  return withAuthenticatedTenant(userId, async (client: PoolClient) => {
    const res = await client.query<ClientRecord>(
      `SELECT * FROM public.clients WHERE id = $1 AND owner_id = $2`,
      [clientId, userId]
    );
    return res.rows[0] ?? null;
  });
}

export async function updateClient(
  userId: string,
  clientId: string,
  input: UpdateClientInput
): Promise<ClientRecord | null> {
  return withAuthenticatedTenant(userId, async (client: PoolClient) => {
    const existing = await getClientById(userId, clientId);
    if (!existing) return null;

    const res = await client.query<ClientRecord>(
      `UPDATE public.clients SET
        name = COALESCE($3, name),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        notes = COALESCE($6, notes),
        gender = COALESCE($7, gender),
        birth_date = COALESCE($8, birth_date),
        birth_time_local = COALESCE($9, birth_time_local),
        birth_timezone = COALESCE($10, birth_timezone),
        birth_city = COALESCE($11, birth_city),
        birth_state_code = COALESCE($12, birth_state_code),
        birth_country_code = COALESCE($13, birth_country_code),
        latitude = COALESCE($14, latitude),
        longitude = COALESCE($15, longitude),
        altitude_meters = COALESCE($16, altitude_meters),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND owner_id = $2
      RETURNING *`,
      [
        clientId,
        userId,
        input.name !== undefined ? input.name : null,
        input.email !== undefined ? input.email : null,
        input.phone !== undefined ? input.phone : null,
        input.notes !== undefined ? input.notes : null,
        input.gender !== undefined ? input.gender : null,
        input.birth_date !== undefined ? input.birth_date : null,
        input.birth_time_local !== undefined ? input.birth_time_local : null,
        input.birth_timezone !== undefined ? input.birth_timezone : null,
        input.birth_city !== undefined ? input.birth_city : null,
        input.birth_state_code !== undefined ? input.birth_state_code : null,
        input.birth_country_code !== undefined ? input.birth_country_code : null,
        input.latitude !== undefined ? input.latitude : null,
        input.longitude !== undefined ? input.longitude : null,
        input.altitude_meters !== undefined ? input.altitude_meters : null,
      ]
    );
    return res.rows[0] ?? null;
  });
}

export async function deleteClient(
  userId: string,
  clientId: string
): Promise<boolean> {
  return withAuthenticatedTenant(userId, async (client: PoolClient) => {
    const res = await client.query(
      `DELETE FROM public.clients WHERE id = $1 AND owner_id = $2 RETURNING id`,
      [clientId, userId]
    );
    return res.rowCount !== null && res.rowCount > 0;
  });
}
