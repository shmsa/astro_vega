import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { listCharts, saveChart, SaveChartInput } from '@/lib/services/charts';

export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const charts = await listCharts(session.user.id);
  return NextResponse.json({ charts });
}

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SaveChartInput;
    const chart = await saveChart(session.user.id, body);
    return NextResponse.json({ chart }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('não pertence') ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
