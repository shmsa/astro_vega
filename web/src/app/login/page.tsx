'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setMessage(error ? error.message : 'Link de acesso enviado.');
  }

  return (
    <main style={{maxWidth: 440, margin: '10vh auto', fontFamily: 'system-ui'}}>
      <h1>Astro Vega</h1>
      <p>Acesso do profissional</p>
      <form onSubmit={sendMagicLink}>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="email" style={{width:'100%', padding:12}} />
        <button type="submit" style={{marginTop:12, padding:'10px 14px'}}>Enviar link de acesso</button>
      </form>
      {message && <p>{message}</p>}
    </main>
  );
}
