import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { getOrCreatePractitionerProfile } from '@/lib/services/profiles';
import { listCharts } from '@/lib/services/charts';
import { listClients } from '@/lib/services/clients';

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

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Astro Vega V1.7</h1>
      <p>Profissional: <strong>{profile.display_name}</strong> ({user.email})</p>
      <p>Perfil padrão: <code>{profile.default_profile_key}</code> | Sistema de Casas: <code>{profile.default_house_system}</code> (Topocêntrico)</p>
      
      <hr style={{ margin: '24px 0' }} />
      
      <h2>Consulentes ({clients.length})</h2>
      {clients.length === 0 ? (
        <p>Nenhum consulente cadastrado.</p>
      ) : (
        <ul>
          {clients.map(c => (
            <li key={c.id}>
              {c.name} {c.birth_date ? `— ${c.birth_date}` : ''} {c.birth_city ? `(${c.birth_city})` : ''}
            </li>
          ))}
        </ul>
      )}

      <hr style={{ margin: '24px 0' }} />

      <h2>Mapas Astrais Gravados ({charts.length})</h2>
      {charts.length === 0 ? (
        <p>Nenhum mapa cadastrado.</p>
      ) : (
        <ul>
          {charts.map(c => (
            <li key={c.id}>
              <strong>{c.chart_name}</strong> — {c.calc_date} {c.calc_time_local} — Perfil: {c.profile_key} (v{c.schema_version})
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
