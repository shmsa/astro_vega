'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';

interface ProfileData {
  display_name: string;
  professional_title: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  default_profile_key: 'vega_classic' | 'modern_swiss' | 'comparative';
  default_house_system: string;
  default_zodiac: string;
  app_settings: Record<string, unknown>;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [defaultProfileKey, setDefaultProfileKey] = useState<'vega_classic' | 'modern_swiss' | 'comparative'>('comparative');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Falha ao carregar perfil profissional');
        const data = await res.json();
        const p: ProfileData = data.profile;
        setProfile(p);
        setDisplayName(p.display_name || '');
        setProfessionalTitle(p.professional_title || '');
        setEmail(p.email || '');
        setPhone(p.phone || '');
        setWebsite(p.website || '');
        setDefaultProfileKey(p.default_profile_key || 'comparative');
      } catch (err: unknown) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          professional_title: professionalTitle || null,
          email: email || null,
          phone: phone || null,
          website: website || null,
          default_profile_key: defaultProfileKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar configurações');
      }

      setProfile(data.profile);
      setMessage({ type: 'success', text: 'Configurações profissionais atualizadas com sucesso!' });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar userEmail={profile?.email || undefined} />

      <main style={{ maxWidth: 760, margin: '32px auto', padding: '0 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
          Configurações Profissionais
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
          Personalize as credenciais e parâmetros astrológicos padrão para as consultas do Erwin.
        </p>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#86efac' : '#f87171'}`
          }}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando perfil...</div>
        ) : (
          <form onSubmit={handleSave} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 12px 0' }}>Identificação no Cabeçalho / Relatórios</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Nome Profissional *</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Ex: Erwin Rommel"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Título Profissional</label>
                  <input
                    type="text"
                    value={professionalTitle}
                    onChange={e => setProfessionalTitle(e.target.value)}
                    placeholder="Ex: Astrólogo Tradicional & Moderno"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 12px 0' }}>Contatos e Divulgação</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Email de Contato</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contato@astrovega.com"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+55 11 99999-9999"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Website / Instagram</label>
                  <input
                    type="text"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="https://astrovega.com"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 12px 0' }}>Parâmetros Astronômicos e Padrões</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Perfil Padrão de Cálculo</label>
                  <select
                    value={defaultProfileKey}
                    onChange={e => setDefaultProfileKey(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="comparative">Comparativo (Clássico Vega + Precisão Atual)</option>
                    <option value="modern_swiss">Precisão Atual (Swiss Ephemeris)</option>
                    <option value="vega_classic">Clássico Vega (Moshier Analítico)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Sistema de Casas Padrão</label>
                  <input
                    type="text"
                    disabled
                    value="Topocêntrico (Polich-Page / T)"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box', background: '#f1f5f9', color: '#64748b' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '10px 24px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
