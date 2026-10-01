import { createNeonAuth } from '@neondatabase/auth/next/server';

const baseUrl = (process.env.NEON_AUTH_BASE_URL || 'https://ep-holy-unit-b6yp2gt7.neonauth.c-2.sa-east-1.aws.neon.tech/neondb/auth').trim().replace(/^["']|["']$/g, '');
const secret = (process.env.NEON_AUTH_COOKIE_SECRET || 'dff44ffdd51f44c2fb0b5280ace02884f17d2c5b35c3c193cbaafa672329b793').trim().replace(/^["']|["']$/g, '');

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret,
    sessionDataTtl: 300,
  },
});
