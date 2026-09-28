import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { getChartById } from '@/lib/services/charts';
import { Navbar } from '@/components/layout/Navbar';
import { ChartResultViewer } from '@/components/astrology/ChartResultViewer';

export const dynamic = 'force-dynamic';

export default async function ChartViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect('/login');
  }

  const { id } = await params;
  const chartRecord = await getChartById(session.user.id, id);
  if (!chartRecord) {
    notFound();
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar userEmail={session.user.email} />

      <main style={{ maxWidth: 1100, margin: '24px auto', padding: '0 20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Link href="/charts" style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>
            ← Voltar para Histórico de Mapas
          </Link>
        </div>

        <ChartResultViewer chartRecord={chartRecord} />
      </main>
    </div>
  );
}
