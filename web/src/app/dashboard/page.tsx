import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '../../lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: charts } = await supabase
    .from('charts')
    .select('id,subject_name,birth_date,location_name,created_at,schema_version')
    .order('created_at', { ascending: false })
    .limit(25);

  return (
    <main style={{maxWidth: 900, margin: '40px auto', fontFamily: 'system-ui'}}>
      <h1>Astro Vega</h1>
      <p>Conectado como {user.email}</p>
      <h2>Mapas recentes</h2>
      <ul>{(charts ?? []).map(c => <li key={c.id}>{c.subject_name} — {c.birth_date ?? 'sem data'} — {c.location_name}</li>)}</ul>
    </main>
  );
}
