'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split('@')[0],
        });
        if (error) {
          setMessage(error.message || 'Erro ao criar conta');
        } else {
          setMessage('Conta criada com sucesso! Redirecionando...');
          window.location.href = '/dashboard';
        }
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error) {
          setMessage(error.message || 'Credenciais inválidas');
        } else {
          setMessage('Autenticado com sucesso! Redirecionando...');
          window.location.href = '/dashboard';
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 440, margin: '10vh auto', fontFamily: 'system-ui', padding: 20 }}>
      <h1>Astro Vega V1.7</h1>
      <p>{isSignUp ? 'Criar nova conta de profissional' : 'Acesso do profissional (Neon Auth)'}</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isSignUp && (
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            type="text"
            placeholder="Nome profissional"
            style={{ width: '100%', padding: 12, boxSizing: 'border-box' }}
          />
        )}
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          required
          placeholder="Email"
          style={{ width: '100%', padding: 12, boxSizing: 'border-box' }}
        />
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          type="password"
          required
          placeholder="Senha"
          style={{ width: '100%', padding: 12, boxSizing: 'border-box' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '12px 14px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Aguarde...' : (isSignUp ? 'Cadastrar' : 'Entrar')}
        </button>
      </form>

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }}
          style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', padding: 0 }}
        >
          {isSignUp ? 'Já possui conta? Entrar' : 'Não tem conta? Criar cadastro'}
        </button>
      </div>

      {message && <p style={{ marginTop: 16, color: message.includes('sucesso') ? 'green' : 'red' }}>{message}</p>}
    </main>
  );
}
