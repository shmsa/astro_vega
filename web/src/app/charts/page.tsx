import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { listCharts } from '@/lib/services/charts';
import { Navbar } from '@/components/layout/Navbar';

export const dynamic = 'force-dynamic';

export default async function ChartsHistoryPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect('/login');
  }

  const charts = await listCharts(session.user.id);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar userEmail={session.user.email} />

      <main style={{ maxWidth: 1000, margin: '32px auto', padding: '0 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>Histórico de Mapas Astrais</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Consulte todos os mapas natais calculados e auditados.</p>
          </div>
          <Link
            href="/charts/new"
            style={{
              background: '#2563eb',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            + Novo Mapa
          </Link>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {charts.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Nenhum mapa salvo no histórico.</p>
              <Link href="/charts/new" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Calcular o primeiro mapa</Link>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '12px 16px' }}>Nome do Mapa</th>
                  <th style={{ padding: '12px 16px' }}>Data / Hora Cálculo</th>
                  <th style={{ padding: '12px 16px' }}>Perfil Ativo</th>
                  <th style={{ padding: '12px 16px' }}>Versão Schema</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {charts.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <Link href={`/charts/${c.id}`} style={{ color: '#1e293b', textDecoration: 'none' }}>
                        {c.chart_name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {c.calc_date} {c.calc_time_local}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>
                        {c.profile_key}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      v{c.schema_version}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Link
                        href={`/charts/${c.id}`}
                        style={{
                          color: '#2563eb',
                          textDecoration: 'none',
                          fontSize: '13px',
                          fontWeight: 600
                        }}
                      >
                        Abrir Mapa →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
