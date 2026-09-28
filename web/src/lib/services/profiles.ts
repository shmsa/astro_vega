import { PoolClient } from '@neondatabase/serverless';
import { withAuthenticatedTenant } from '@/lib/db';

export interface PractitionerProfile {
  user_id: string;
  display_name: string;
  professional_title: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  default_profile_key: 'vega_classic' | 'modern_swiss' | 'comparative';
  default_house_system: string;
  default_zodiac: string;
  app_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function getOrCreatePractitionerProfile(
  userId: string,
  userMetadata?: { name?: string | null; email?: string | null }
): Promise<PractitionerProfile> {
  return withAuthenticatedTenant(userId, async (client: PoolClient) => {
    // 1. Check if profile already exists for this tenant
    const existing = await client.query<PractitionerProfile>(
      `SELECT * FROM public.practitioner_profiles WHERE user_id = $1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // 2. Auto-create profile on first access
    const displayName = userMetadata?.name || userMetadata?.email?.split('@')[0] || 'Astrólogo';
    const email = userMetadata?.email || null;

    const inserted = await client.query<PractitionerProfile>(
      `INSERT INTO public.practitioner_profiles (
        user_id,
        display_name,
        email,
        default_profile_key,
        default_house_system,
        default_zodiac,
        app_settings
      ) VALUES ($1, $2, $3, 'comparative', 'T', 'tropical', '{}'::jsonb)
      ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [userId, displayName, email]
    );

    return inserted.rows[0];
  });
}

export interface UpdatePractitionerProfileInput {
  display_name?: string;
  professional_title?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  default_profile_key?: 'vega_classic' | 'modern_swiss' | 'comparative';
  app_settings?: Record<string, unknown>;
}

export async function updatePractitionerProfile(
  userId: string,
  input: UpdatePractitionerProfileInput
): Promise<PractitionerProfile> {
  return withAuthenticatedTenant(userId, async (client: PoolClient) => {
    const fields: string[] = [];
    const values: unknown[] = [userId];
    let idx = 2;

    if (input.display_name !== undefined) {
      fields.push(`display_name = $${idx++}`);
      values.push(input.display_name);
    }
    if (input.professional_title !== undefined) {
      fields.push(`professional_title = $${idx++}`);
      values.push(input.professional_title);
    }
    if (input.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(input.email);
    }
    if (input.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(input.phone);
    }
    if (input.website !== undefined) {
      fields.push(`website = $${idx++}`);
      values.push(input.website);
    }
    if (input.default_profile_key !== undefined) {
      fields.push(`default_profile_key = $${idx++}`);
      values.push(input.default_profile_key);
    }
    if (input.app_settings !== undefined) {
      fields.push(`app_settings = $${idx++}`);
      values.push(JSON.stringify(input.app_settings));
    }

    if (fields.length === 0) {
      const current = await client.query<PractitionerProfile>(
        `SELECT * FROM public.practitioner_profiles WHERE user_id = $1`,
        [userId]
      );
      return current.rows[0];
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE public.practitioner_profiles
      SET ${fields.join(', ')}
      WHERE user_id = $1
      RETURNING *
    `;

    const res = await client.query<PractitionerProfile>(query, values);
    return res.rows[0];
  });
}

