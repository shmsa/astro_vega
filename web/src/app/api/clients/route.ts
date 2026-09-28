import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { listClients, createClient, CreateClientInput } from '@/lib/services/clients';

export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clients = await listClients(session.user.id);
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateClientInput;
    const client = await createClient(session.user.id, body);
    return NextResponse.json({ client }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
