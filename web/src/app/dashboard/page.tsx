import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { getOrCreatePractitionerProfile } from '@/lib/services/profiles';
import { listCharts } from '@/lib/services/charts';
import { listClients } from '@/lib/services/clients';
import { Navbar } from '@/components/layout/Navbar';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user;
  const profile = await getOrCreatePractitionerProfile(user.id, {
    name: user.name,
    email: user.email,
  });

  const [charts, clients] = await Promise.all([
    listCharts(user.id),
    listClients(user.id),
  ]);

  const recentCharts = charts.slice(0, 5);
  const recentClients = clients.slice(0, 5);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar userEmail={user.email} />

      <main style={{ maxWidth: 1040, margin: '32px auto', padding: '0 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Cabeçalho de Boas-Vindas */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '28px 32px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', background: '#3b82f6', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.5px' }}>MOTOR V1.7 AUDITADO</span>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Topocêntrico Polich-Page</span>
            </div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '26px', fontWeight: 800 }}>
              Olá, {profile.display_name}
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1' }}>
              {profile.professional_title || 'Praticante de Astrologia Tradicional e Moderna'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              href="/charts/new"
              style={{
                background: '#2563eb',
                color: '#ffffff',
                padding: '12px 20px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ⚡ Novo Mapa Natal
            </Link>
            <Link
              href="/clients/new"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '12px 20px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px'
              }}
            >
              + Consulente
            </Link>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Total de Consulentes</span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b' }}>{clients.length}</div>
            <Link href="/clients" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>Gerenciar consulentes →</Link>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Mapas Natais Gravados</span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b' }}>{charts.length}</div>
            <Link href="/charts" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>Ver histórico completo →</Link>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Perfil Padrão Ativo</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginTop: '6px' }}>
              {profile.default_profile_key === 'comparative' ? '⚖️ Comparativo' : (profile.default_profile_key === 'modern_swiss' ? '🔬 Precisão Atual' : '🏛️ Clássico Vega')}
            </div>
            <Link href="/settings" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', marginTop: '10px', display: 'inline-block' }}>Alterar configurações →</Link>
          </div>
        </div>

        {/* Listagens Recentes em 2 Colunas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
          {/* Mapas Recentes */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1e293b' }}>Últimos Mapas Calculados</h2>
              <Link href="/charts" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none' }}>Ver todos</Link>
            </div>

            {recentCharts.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                Nenhum mapa salvo ainda.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {recentCharts.map(ch => (
                  <li key={ch.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <Link href={`/charts/${ch.id}`} style={{ fontWeight: 600, color: '#1e293b', textDecoration: 'none', fontSize: '14px' }}>
                        {ch.chart_name}
                      </Link>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {ch.calc_date} {ch.calc_time_local} • <span style={{ color: '#2563eb' }}>{ch.profile_key}</span>
                      </div>
                    </div>
                    <Link href={`/charts/${ch.id}`} style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                      Abrir →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Consulentes Recentes */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1e293b' }}>Consulentes Recentes</h2>
              <Link href="/clients" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none' }}>Ver todos</Link>
            </div>

            {recentClients.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                Nenhum consulente cadastrado.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {recentClients.map(cl => (
                  <li key={cl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <Link href={`/clients/${cl.id}`} style={{ fontWeight: 600, color: '#1e293b', textDecoration: 'none', fontSize: '14px' }}>
                        {cl.name}
                      </Link>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {cl.birth_city || cl.birth_date || 'Sem dados adicionais'}
                      </div>
                    </div>
                    <Link href={`/charts/new?clientId=${cl.id}`} style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                      Calcular →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
