'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { ChartRecord } from '@/lib/services/charts';
import type { FixedStarsResult, FixedStarPosition, FixedStarAspect } from '@/lib/astrology/fixed-stars/types';

interface FixedStarsViewProps {
  chartRecord: ChartRecord;
}

export function FixedStarsView({ chartRecord }: FixedStarsViewProps) {
  const [data, setData] = useState<FixedStarsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros e ordenação
  const [search, setSearch] = useState('');
  const [constellationFilter, setConstellationFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'zodiac' | 'alpha'>('zodiac');
  const [aspectsOnly, setAspectsOnly] = useState(false);

  // Extrai JD e posições dos planetas do mapa
  const chart = chartRecord.modern_result || chartRecord.classic_result;
  const jd_ut = chartRecord.julian_day_utc || chart?.julian_day_ut;

  // Extrai mapa de planetas: { sun: lon, moon: lon, ... }
  const planetsMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (chart?.points) {
      for (const [key, p] of Object.entries(chart.points)) {
        if (p && typeof p.longitude === 'number') {
          map[key.toLowerCase()] = p.longitude;
        }
      }
    }
    return map;
  }, [chart]);


  // Carrega os dados na montagem
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!jd_ut) {
        setError('Julian Day UT não disponível neste mapa.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Tenta carregar do cache de banco de dados se houver
        if (chartRecord.id) {
          const res = await fetch(`/api/fixed-stars?chart_id=${chartRecord.id}`);
          if (res.ok) {
            const json = await res.json();
            if (json.module?.result && isMounted) {
              setData(json.module.result as FixedStarsResult);
              setLoading(false);
              return;
            }
          }
        }

        // 2. Se não estiver salvo, calcula via POST e persiste
        const calcRes = await fetch('/api/fixed-stars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jd_ut,
            planets: planetsMap,
            chart_id: chartRecord.id,
          }),
        });

        if (!calcRes.ok) {
          const errData = await calcRes.json().catch(() => ({}));
          throw new Error(errData.error || `Erro HTTP ${calcRes.status}`);
        }

        const calcJson = await calcRes.json();
        if (isMounted) {
          setData(calcJson.result);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [chartRecord.id, jd_ut, planetsMap]);

  // Lista de constelações únicas
  const constellations = useMemo(() => {
    if (!data?.stars) return [];
    const set = new Set<string>();
    data.stars.forEach((s) => set.add(s.constellation));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [data]);

  // Mapa de aspectos indexados por estrela
  const starAspectsMap = useMemo(() => {
    const map = new Map<string, FixedStarAspect[]>();
    if (data?.aspects) {
      data.aspects.forEach((a) => {
        const list = map.get(a.star_id) || [];
        list.push(a);
        map.set(a.star_id, list);
      });
    }
    return map;
  }, [data]);

  // Filtragem e ordenação das estrelas
  const filteredStars = useMemo(() => {
    if (!data?.stars) return [];

    let list = [...data.stars];

    // Busca textual
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.constellation.toLowerCase().includes(q) ||
          s.influence.toLowerCase().includes(q)
      );
    }

    // Filtro de constelação
    if (constellationFilter !== 'ALL') {
      list = list.filter((s) => s.constellation === constellationFilter);
    }

    // Filtro apenas com aspectos
    if (aspectsOnly) {
      list = list.filter((s) => starAspectsMap.has(s.id));
    }

    // Ordenação
    if (sortOrder === 'alpha') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    } else {
      list.sort((a, b) => a.longitude - b.longitude);
    }

    return list;
  }, [data, search, constellationFilter, aspectsOnly, sortOrder, starAspectsMap]);

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        color: '#64748b'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
        <div style={{ fontWeight: 600 }}>Calculando posições e precessão das estrelas fixas...</div>
        <div style={{ fontSize: '13px', marginTop: '6px' }}>Algoritmo IAU 1976 para a época exata do mapa.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '24px',
        background: '#fef2f2',
        borderRadius: '8px',
        border: '1px solid #fecaca',
        color: '#991b1b'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>⚠️ Erro no Módulo de Estrelas Fixas</h4>
        <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Banner Informativo */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#f8fafc',
        borderRadius: '8px',
        padding: '24px',
        border: '1px solid #334155',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px' }}>⭐</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>
                Módulo de Estrelas Fixas — Vega 7 Revival
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8', maxWidth: '640px', lineHeight: 1.5 }}>
              Posições corrigidas pela <strong>precessão dos equinócios (IAU 1976)</strong> para a data do mapa (Época: {data.epoch_year}).
              Aspectos considerados conforme o padrão do Vega 7: Conjunção (☌), Quadratura (□) e Oposição (☍).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catálogo</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8' }}>{data.stars.length} Estrelas</div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aspectos</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fbbf24' }}>{data.aspects.length} Formados</div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Orbe Padrão</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#a78bfa' }}>1°00' (Provisório)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 1: Aspectos Ativos com Planetas */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
              Aspectos Estrelas × Planetas ({data.aspects.length})
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Apenas ☌ (0°), □ (90°) e ☍ (180°) com os 10 planetas natais principais
            </span>
          </div>
          <span style={{
            fontSize: '11px',
            background: '#fef3c7',
            color: '#92400e',
            padding: '4px 8px',
            borderRadius: '4px',
            fontWeight: 600,
            border: '1px solid #fde68a'
          }}>
            Orbe: Provisório (1°00') — Vega 7
          </span>
        </div>

        {data.aspects.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', borderRadius: '6px' }}>
            Nenhum aspecto exato (orbe ≤ 1°00') encontrado entre as estrelas do catálogo e os planetas deste mapa.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Estrela</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Aspecto</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Planeta</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Orbe</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.aspects.map((a, idx) => (
                  <tr key={`${a.star_id}-${a.planet_key}-${a.aspect_type}-${idx}`} style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? '#fff' : '#fcfcfd'
                  }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                      {a.star_name}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        color: a.aspect_type === 'conjunction' ? '#2563eb' : (a.aspect_type === 'opposition' ? '#dc2626' : '#d97706')
                      }}>
                        <span style={{ fontSize: '16px' }}>{a.aspect_symbol}</span>
                        <span>{a.aspect_type === 'conjunction' ? 'Conjunção' : (a.aspect_type === 'opposition' ? 'Oposição' : 'Quadratura')}</span>
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#334155' }}>
                      {a.planet}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#475569' }}>
                      {Math.floor(a.orb)}°{String(Math.round((a.orb % 1) * 60)).padStart(2, '0')}' ({a.orb.toFixed(2)}°)
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: '11px',
                        background: '#f1f5f9',
                        color: '#64748b',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {a.orb_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seção 2: Tabela Completa do Catálogo de Estrelas */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
            Catálogo e Efemérides Precessadas ({filteredStars.length} de {data.stars.length})
          </h4>

          {/* Barra de Filtros */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Buscar estrela ou efeito..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                width: '180px'
              }}
            />

            <select
              value={constellationFilter}
              onChange={(e) => setConstellationFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                background: '#fff',
                color: '#334155'
              }}
            >
              <option value="ALL">Todas as Constelações</option>
              {constellations.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'zodiac' | 'alpha')}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                background: '#fff',
                color: '#334155'
              }}
            >
              <option value="zodiac">Ordem Zodiacal (Longitude)</option>
              <option value="alpha">Ordem Alfabética (Nome)</option>
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: '#334155' }}>
              <input
                type="checkbox"
                checked={aspectsOnly}
                onChange={(e) => setAspectsOnly(e.target.checked)}
              />
              Apenas com aspectos
            </label>
          </div>
        </div>

        {/* Tabela de Estrelas */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Estrela</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Constelação</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Longitude ({data.epoch_year})</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Latitude</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Aspectos</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, width: '40%' }}>Natureza e Influência Astrológica</th>
              </tr>
            </thead>
            <tbody>
              {filteredStars.map((s, idx) => {
                const aspects = starAspectsMap.get(s.id) || [];
                const hasAspects = aspects.length > 0;

                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: hasAspects ? '#fffbeb' : (idx % 2 === 0 ? '#fff' : '#fcfcfd')
                    }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{s.name}</div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>
                      {s.constellation}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <strong style={{ color: '#0369a1' }}>{s.longitude_zodiac}</strong>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.longitude.toFixed(2)}°</div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {s.latitude >= 0 ? `+${s.latitude.toFixed(2)}°` : `${s.latitude.toFixed(2)}°`}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {aspects.length === 0 ? (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {aspects.map((a, aIdx) => (
                            <span
                              key={aIdx}
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                background: a.aspect_type === 'conjunction' ? '#dbeafe' : (a.aspect_type === 'opposition' ? '#fee2e2' : '#fef3c7'),
                                color: a.aspect_type === 'conjunction' ? '#1e40af' : (a.aspect_type === 'opposition' ? '#991b1b' : '#92400e'),
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}
                            >
                              {a.aspect_symbol} {a.planet}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '12px', color: '#334155', lineHeight: 1.4 }}>
                      <div>{s.influence}</div>
                      {s.source && (
                        <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '3px' }}>
                          Fontes: {s.source}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
