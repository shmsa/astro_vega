import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { listClients } from '@/lib/services/clients';
import { Navbar } from '@/components/layout/Navbar';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect('/login');
  }

  const clients = await listClients(session.user.id);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar userEmail={session.user.email} />

      <main style={{ maxWidth: 1000, margin: '32px auto', padding: '0 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>Consulentes</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Gerencie o cadastro e histórico dos seus consulentes.</p>
          </div>
          <Link
            href="/clients/new"
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
            + Novo Consulente
          </Link>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {clients.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Nenhum consulente cadastrado ainda.</p>
              <Link href="/clients/new" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Cadastrar primeiro consulente</Link>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '12px 16px' }}>Nome</th>
                  <th style={{ padding: '12px 16px' }}>Data de Nascimento</th>
                  <th style={{ padding: '12px 16px' }}>Cidade / País</th>
                  <th style={{ padding: '12px 16px' }}>Contato</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <Link href={`/clients/${c.id}`} style={{ color: '#1e293b', textDecoration: 'none' }}>
                        {c.name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {c.birth_date ? `${c.birth_date} ${c.birth_time_local || ''}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {c.birth_city ? `${c.birth_city}${c.birth_country_code ? ` / ${c.birth_country_code}` : ''}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {c.email || c.phone || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Link
                        href={`/charts/new?clientId=${c.id}`}
                        style={{
                          marginRight: '12px',
                          color: '#2563eb',
                          textDecoration: 'none',
                          fontSize: '13px',
                          fontWeight: 600
                        }}
                      >
                        Gerar Mapa
                      </Link>
                      <Link
                        href={`/clients/${c.id}`}
                        style={{
                          color: '#475569',
                          textDecoration: 'none',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        Ver Perfil
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
