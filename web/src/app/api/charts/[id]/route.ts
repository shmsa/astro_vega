import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getChartById, deleteChart } from '@/lib/services/charts';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const chart = await getChartById(session.user.id, id);
  if (!chart) {
    return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
  }

  // Regra 11: Retornar estritamente os snapshots persistidos sem recalcular
  return NextResponse.json({ chart });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteChart(session.user.id, id);
  if (!deleted) {
    return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
