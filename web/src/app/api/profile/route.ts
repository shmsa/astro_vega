import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import {
  getOrCreatePractitionerProfile,
  updatePractitionerProfile,
  UpdatePractitionerProfileInput,
} from '@/lib/services/profiles';

export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profile = await getOrCreatePractitionerProfile(session.user.id, {
      name: session.user.name,
      email: session.user.email,
    });

    return NextResponse.json({ profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json({ error: message, stack }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as UpdatePractitionerProfileInput;
    const profile = await updatePractitionerProfile(session.user.id, body);
    return NextResponse.json({ profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
