import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { getClientById } from '@/lib/services/clients';
import { listCharts } from '@/lib/services/charts';
import { Navbar } from '@/components/layout/Navbar';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect('/login');
  }

  const { id } = await params;
  const client = await getClientById(session.user.id, id);
  if (!client) {
    notFound();
  }

  const allCharts = await listCharts(session.user.id);
  const clientCharts = allCharts.filter(c => c.client_id === client.id);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar userEmail={session.user.email} />

      <main style={{ maxWidth: 900, margin: '32px auto', padding: '0 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ marginBottom: '16px' }}>
          <Link href="/clients" style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>
            ← Voltar para Consulentes
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>{client.name}</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              Cadastrado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <Link
            href={`/charts/new?clientId=${client.id}`}
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
            + Gerar Novo Mapa
          </Link>
        </div>

        {/* Ficha Cadastral */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Dados de Nascimento e Contato</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', fontSize: '14px' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>Data de Nascimento</span>
              <strong>{client.birth_date || 'Não informada'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>Hora Local</span>
              <strong>{client.birth_time_local || 'Não informada'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>Cidade</span>
              <strong>{client.birth_city || 'Não informada'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>Fuso Horário</span>
              <strong>{client.birth_timezone || '—'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>Coordenadas</span>
              <strong>{client.latitude ? `${client.latitude}°, ${client.longitude}°` : '—'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>Contato</span>
              <strong>{client.email || client.phone || '—'}</strong>
            </div>
          </div>

          {client.notes && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '12px', marginBottom: '4px' }}>Notas</span>
              <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: '1.5' }}>{client.notes}</p>
            </div>
          )}
        </div>

        {/* Mapas do Consulente */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
            Mapas Astrais Deste Consulente ({clientCharts.length})
          </h2>

          {clientCharts.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              Nenhum mapa salvo para este consulente ainda.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '10px 12px' }}>Nome do Mapa</th>
                  <th style={{ padding: '10px 12px' }}>Data / Hora Cálculo</th>
                  <th style={{ padding: '10px 12px' }}>Perfil</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {clientCharts.map(ch => (
                  <tr key={ch.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{ch.chart_name}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>{ch.calc_date} {ch.calc_time_local}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>
                        {ch.profile_key}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <Link href={`/charts/${ch.id}`} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
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
