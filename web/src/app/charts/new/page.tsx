'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { ChartResultViewer } from '@/components/astrology/ChartResultViewer';
import type { ChartRecord } from '@/lib/services/charts';
import type { ConsultationResult } from '@/lib/astrology/consultation-profiles';
import { parseHslString } from '@/lib/astrology/format';

interface ClientItem {
  id: string;
  name: string;
  birth_date: string | null;
  birth_time_local: string | null;
  birth_city: string | null;
  birth_timezone: string | null;
  latitude: number | null;
  longitude: number | null;
}

function NewChartForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams?.get('clientId') || '';

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId);

  const [chartName, setChartName] = useState('');
  const [profileKey, setProfileKey] = useState<'comparative' | 'vega_classic' | 'modern_swiss'>('comparative');
  const [date, setDate] = useState('1976-10-18');
  const [localTime, setLocalTime] = useState('15:10:00');
  const [timezone, setTimezone] = useState('America/Belem');
  const [utcOffsetHours, setUtcOffsetHours] = useState(-3);
  const [latitude, setLatitude] = useState(-1.4558);
  const [longitude, setLongitude] = useState(-48.5039);
  const [locationName, setLocationName] = useState('Belém, PA, Brasil');
  const [classicHsl, setClassicHsl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');

  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [calcResult, setCalcResult] = useState<ConsultationResult | null>(null);
  const [savedChartId, setSavedChartId] = useState<string | null>(null);


  useEffect(() => {
    async function loadData() {
      try {
        const [clientsRes, profileRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/profile'),
        ]);

        if (clientsRes.ok) {
          const cData = await clientsRes.json();
          setClients(cData.clients || []);
        }

        if (profileRes.ok) {
          const pData = await profileRes.json();
          if (pData.profile?.default_profile_key) {
            setProfileKey(pData.profile.default_profile_key);
          }
        }
      } catch (err) {
        console.error('Failed to load prefetch data', err);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    const client = clients.find(c => c.id === selectedClientId);
    if (client) {
      if (!chartName) setChartName(`Mapa de ${client.name}`);
      if (client.birth_date) setDate(client.birth_date);
      if (client.birth_time_local) setLocalTime(client.birth_time_local);
      if (client.birth_city) setLocationName(client.birth_city);
      if (client.latitude != null) setLatitude(client.latitude);
      if (client.longitude != null) setLongitude(client.longitude);
      if (client.birth_timezone) setTimezone(client.birth_timezone);
    }
  }, [selectedClientId, clients]);

  async function handleCalculateAndSave(e: React.FormEvent, autoSave: boolean = true) {
    e.preventDefault();
    setError('');
    setCalculating(true);
    if (autoSave) {
      setSaving(true);
    }
    setCalcResult(null);

    const profileIdMap: Record<string, 'classic' | 'modern' | 'comparative'> = {
      vega_classic: 'classic',
      modern_swiss: 'modern',
      comparative: 'comparative',
    };

    const parsedHsl = (profileKey === 'vega_classic' || profileKey === 'comparative')
      ? parseHslString(classicHsl)
      : null;

    try {
      // 1. Executa o cálculo astronômico de alta precisão
      const res = await fetch('/api/charts/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: profileIdMap[profileKey],
          subject: {
            name: chartName || 'Consulente',
            date,
            local_time: localTime,
            utc_offset_hours: Number(utcOffsetHours),
            latitude: Number(latitude),
            longitude: Number(longitude),
            location_name: locationName,
            ...(parsedHsl != null ? { classic_hsl_hours: parsedHsl } : {}),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao calcular mapa');
      }

      const result: ConsultationResult = data.result;
      setCalcResult(result);

      // 2. Se autoSave estiver ativo (padrão), persiste imediatamente no Neon
      if (autoSave) {
        const targetResult = result.classic_result || result.modern_result;
        if (!targetResult) {
          throw new Error('Nenhum resultado astronômico gerado para gravação.');
        }

        const parsedTags = tagsInput
          ? tagsInput.split(',').map(t => t.trim()).filter(Boolean)
          : [];

        const calculationMetadata: Record<string, unknown> = {
          ephemeris_sources: {
            classic: 'moshier_analytical',
            modern: 'swiss_ephemeris_se1',
          },
          chiron_source: 'swiss_ephemeris_se1',
          house_system: 'topocentric_polich_page',
        };

        if (parsedHsl != null) {
          calculationMetadata.historical_hsl = classicHsl.trim();
          calculationMetadata.historical_hsl_override = true;
          calculationMetadata.classic_hsl_hours = parsedHsl;
        }

        const payload = {
          clientId: selectedClientId || null,
          chartName: chartName || `Mapa Natal - ${date}`,
          profileKey,
          calcDate: date,
          calcTimeLocal: localTime,
          calcTimezone: timezone,
          calcUtc: targetResult.utc,
          utcOffsetMinutes: Math.round(utcOffsetHours * 60),
          latitude: Number(latitude),
          longitude: Number(longitude),
          julianDayUtc: targetResult.julian_day_ut,
          notes: notes || null,
          tags: parsedTags,
          calculationMetadata,
          classicResult: result.classic_result || null,
          modernResult: result.modern_result || null,
          comparisonResult: result.comparison_result || null,
        };

        const saveRes = await fetch('/api/charts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const saveData = await saveRes.json();
        if (!saveRes.ok) {
          throw new Error(saveData.error || 'Erro ao persistir mapa no histórico');
        }

        // Redireciona diretamente para a visualização persistida no banco
        router.push(`/charts/${saveData.chart.id}`);
        return;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCalculating(false);
      setSaving(false);
    }
  }

  async function handleSaveChart() {
    if (!calcResult) return;
    setSaving(true);
    setError('');

    const targetResult = calcResult.classic_result || calcResult.modern_result;
    if (!targetResult) {
      setError('Nenhum resultado de cálculo para salvar.');
      setSaving(false);
      return;
    }

    const parsedHsl = (profileKey === 'vega_classic' || profileKey === 'comparative')
      ? parseHslString(classicHsl)
      : null;

    const parsedTags = tagsInput
      ? tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const calculationMetadata: Record<string, unknown> = {
      ephemeris_sources: {
        classic: 'moshier_analytical',
        modern: 'swiss_ephemeris_se1',
      },
      chiron_source: 'swiss_ephemeris_se1',
      house_system: 'topocentric_polich_page',
    };

    if (parsedHsl != null) {
      calculationMetadata.historical_hsl = classicHsl.trim();
      calculationMetadata.historical_hsl_override = true;
      calculationMetadata.classic_hsl_hours = parsedHsl;
    }

    try {
      const payload = {
        clientId: selectedClientId || null,
        chartName: chartName || `Mapa Natal - ${date}`,
        profileKey,
        calcDate: date,
        calcTimeLocal: localTime,
        calcTimezone: timezone,
        calcUtc: targetResult.utc,
        utcOffsetMinutes: Math.round(utcOffsetHours * 60),
        latitude: Number(latitude),
        longitude: Number(longitude),
        julianDayUtc: targetResult.julian_day_ut,
        notes: notes || null,
        tags: parsedTags,
        calculationMetadata,
        classicResult: calcResult.classic_result || null,
        modernResult: calcResult.modern_result || null,
        comparisonResult: calcResult.comparison_result || null,
      };

      const res = await fetch('/api/charts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao persistir mapa');
      }

      setSavedChartId(data.chart.id);
      router.push(`/charts/${data.chart.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  const parsedHsl = (profileKey === 'vega_classic' || profileKey === 'comparative')
    ? parseHslString(classicHsl)
    : null;
  const parsedTags = tagsInput
    ? tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  // Prepara mock de ChartRecord para preview do ChartResultViewer
  const previewChartRecord: ChartRecord | null = calcResult ? {
    id: savedChartId || 'preview',
    owner_id: 'current',
    client_id: selectedClientId || null,
    chart_name: chartName || 'Pré-visualização do Mapa',
    chart_type: 'natal',
    profile_key: profileKey,
    schema_version: 1,
    engine_version: '1.7',
    profile_version: 'VEGA_GOODLUCK_PROFILE_V1',
    calculation_metadata: parsedHsl != null ? {
      historical_hsl: classicHsl.trim(),
      historical_hsl_override: true,
      classic_hsl_hours: parsedHsl,
    } : {},
    calc_date: date,
    calc_time_local: localTime,
    calc_timezone: timezone,
    calc_utc: (calcResult.classic_result || calcResult.modern_result)?.utc || '',
    utc_offset_minutes: Math.round(utcOffsetHours * 60),
    utc_offset_hours: Number(utcOffsetHours),
    latitude: Number(latitude),
    longitude: Number(longitude),
    altitude_meters: 0,
    house_system: 'T',
    zodiac: 'tropical',
    julian_day_utc: (calcResult.classic_result || calcResult.modern_result)?.julian_day_ut || 0,
    delta_t_seconds: null,
    sidereal_time_armc: null,
    classic_result: calcResult.classic_result || null,
    modern_result: calcResult.modern_result || null,
    comparison_result: calcResult.comparison_result || null,
    notes: notes || null,
    tags: parsedTags,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } : null;


  return (
    <div style={{ maxWidth: 1100, margin: '32px auto', padding: '0 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '0 0 6px 0' }}>Novo Mapa Natal</h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          Execute os motores com precisão astronômica suíça e comparação integral Clássico Vega.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Formulário de Cálculo */}
      {/* Formulário de Cálculo */}
      <form onSubmit={(e) => handleCalculateAndSave(e, true)} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Vincular a Consulente (Opcional)</label>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', background: '#fff' }}
            >
              <option value="">-- Mapa avulso (sem vínculo) --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Nome / Título do Mapa *</label>
            <input
              type="text"
              required
              value={chartName}
              onChange={e => setChartName(e.target.value)}
              placeholder="Ex: Mapa Natal - Erwin Rommel"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Perfil de Cálculo</label>
            <select
              value={profileKey}
              onChange={e => setProfileKey(e.target.value as any)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', background: '#fff' }}
            >
              <option value="comparative">Comparativo (Clássico Vega + Precisão Atual)</option>
              <option value="modern_swiss">Precisão Atual (Swiss Ephemeris)</option>
              <option value="vega_classic">Clássico Vega (Moshier Analítico)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Data de Nascimento *</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Hora Local (hh:mm:ss) *</label>
            <input
              type="time"
              step="1"
              required
              value={localTime}
              onChange={e => setLocalTime(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Fuso Horário (UTC Offset em Horas) *</label>
            <input
              type="number"
              step="0.1"
              required
              value={utcOffsetHours}
              onChange={e => setUtcOffsetHours(parseFloat(e.target.value))}
              placeholder="-3"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Cidade / Local de Nascimento</label>
            <input
              type="text"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              placeholder="Belém, PA, Brasil"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Latitude (-90 a 90) *</label>
            <input
              type="number"
              step="0.0001"
              required
              value={latitude}
              onChange={e => setLatitude(parseFloat(e.target.value))}
              placeholder="-1.4558"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Longitude (-180 a 180) *</label>
            <input
              type="number"
              step="0.0001"
              required
              value={longitude}
              onChange={e => setLongitude(parseFloat(e.target.value))}
              placeholder="-48.5039"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Opções Avançadas / Reprodução Histórica Vega */}
        {(profileKey === 'vega_classic' || profileKey === 'comparative') && (
          <details style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px 16px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#1e40af' }}>
              ⚙️ Opções avançadas / Reprodução histórica Vega
            </summary>
            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  HSL histórica (opcional)
                </label>
                <input
                  type="text"
                  value={classicHsl}
                  onChange={e => setClassicHsl(e.target.value)}
                  placeholder="ex: 18:52:24 (HH:MM:SS)"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', fontFamily: 'monospace' }}
                />
                <small style={{ display: 'block', color: '#64748b', fontSize: '11px', marginTop: '4px', lineHeight: '1.4' }}>
                  Preencha exclusivamente ao reproduzir documentos arquivados do Rommel/Vega com HSL impressa. Deixe vazio para o cálculo clássico normal pela fórmula legada.
                </small>
              </div>
            </div>
          </details>
        )}

        {/* Campos Editoriais: Tags e Notas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Tags (separadas por vírgula)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="ex: natal, sergio, consulta"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Observações Editoriais (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anotações internas do atendimento"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={(e) => handleCalculateAndSave(e, false)}
            disabled={calculating || saving}
            style={{
              padding: '12px 20px',
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: (calculating || saving) ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            👁️ Apenas Pré-visualizar
          </button>

          <button
            type="submit"
            disabled={calculating || saving}
            style={{
              padding: '12px 28px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: (calculating || saving) ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {saving ? 'Gravando no Histórico...' : (calculating ? 'Calculando...' : '⚡ Calcular e Salvar no Histórico')}
          </button>
        </div>

      </form>

      {/* Visualizador de Resultado em Modo Pré-Visualização */}
      {previewChartRecord && (
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontWeight: 700, color: '#92400e', fontSize: '15px' }}>👁️ Pré-visualização Ativa</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#b45309' }}>
                Este mapa está sendo exibido em memória. Para que ele apareça no seu histórico e dashboard, clique no botão ao lado.
              </p>
            </div>
            <button
              onClick={handleSaveChart}
              disabled={saving}
              style={{
                padding: '10px 24px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {saving ? 'Gravando no Neon...' : '💾 Salvar Mapa no Histórico Agora'}
            </button>
          </div>

          <ChartResultViewer chartRecord={previewChartRecord} />
        </div>
      )}
    </div>
  );
}

export default function NewChartPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar />
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>}>
        <NewChartForm />
      </Suspense>
    </div>
  );
}
