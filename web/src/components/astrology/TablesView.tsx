'use client';

import React from 'react';
import type { ChartResult } from '@/lib/astrology/contracts';
import { formatZodiac } from '@/lib/astrology/math';

interface TablesViewProps {
  chart: ChartResult;
}

export function TablesView({ chart }: TablesViewProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
      {/* 1. Posições Planetárias */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
          Posições Planetárias e Pontos
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Ponto</th>
              <th style={{ padding: '8px' }}>Signo / Posição</th>
              <th style={{ padding: '8px' }}>Casa</th>
              <th style={{ padding: '8px' }}>Velocidade</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(chart.points).map((pt) => (
              <tr key={pt.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px', fontWeight: 500 }}>
                  <span style={{ marginRight: '6px', fontSize: '15px' }}>{pt.glyph}</span>
                  {pt.name}
                </td>
                <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                  {formatZodiac(pt.longitude, pt.retrograde)}
                </td>
                <td style={{ padding: '8px' }}>
                  {pt.house_interpretive ? `Casa ${pt.house_interpretive}` : (pt.house_geometric ? `Casa ${pt.house_geometric}` : '—')}
                </td>
                <td style={{ padding: '8px', color: '#64748b' }}>
                  {pt.speed_longitude != null ? `${pt.speed_longitude.toFixed(2)}°/dia` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2. Cúspides das Casas */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
          Cúspides das Casas (Topocêntrico Polich-Page)
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Casa</th>
              <th style={{ padding: '8px' }}>Cúspide</th>
              <th style={{ padding: '8px' }}>Grau Decimal</th>
            </tr>
          </thead>
          <tbody>
            {chart.cusps.map((lon, idx) => (
              <tr key={`cusp-${idx + 1}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px', fontWeight: 600 }}>Casa {idx + 1}</td>
                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{formatZodiac(lon)}</td>
                <td style={{ padding: '8px', color: '#64748b' }}>{lon.toFixed(4)}°</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. Pontuações e Balanço Elemental */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
          Pontuações e Distribuição Energética
        </h3>
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#475569' }}>Elementos</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
            {Object.entries(chart.scores.elements).map(([elem, pts]) => (
              <div key={elem} style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{elem}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{pts}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#475569' }}>Modalidades</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
            {Object.entries(chart.scores.modalities).map(([mod, pts]) => (
              <div key={mod} style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{mod}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{pts}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#475569' }}>Polaridades</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', textAlign: 'center' }}>
            {Object.entries(chart.scores.polarities).map(([pol, pts]) => (
              <div key={pol} style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{pol}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{pts}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Fase Lunar & Dados Técnicos */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
          Fase Lunar e Parâmetros Astronômicos
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}>
          Fase Lunar Atual: <strong>{chart.lunar_phase}</strong>
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px', color: '#64748b' }}>Motor:</td>
              <td style={{ padding: '6px', fontWeight: 600 }}>{chart.engine.name} ({chart.engine.id})</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px', color: '#64748b' }}>Data / Hora UTC:</td>
              <td style={{ padding: '6px' }}>{chart.utc}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px', color: '#64748b' }}>Julian Day (UT):</td>
              <td style={{ padding: '6px', fontFamily: 'monospace' }}>{chart.julian_day_ut.toFixed(6)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px', color: '#64748b' }}>Zodíaco:</td>
              <td style={{ padding: '6px' }}>{chart.settings.zodiac}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px', color: '#64748b' }}>Sistema de Casas:</td>
              <td style={{ padding: '6px' }}>{chart.settings.house_system} ({chart.settings.house_system_code})</td>
            </tr>
            {chart.house_calculation && (
              <tr>
                <td style={{ padding: '6px', color: '#64748b' }}>Modo de Cálculo ARMC:</td>
                <td style={{ padding: '6px' }}>{String(chart.house_calculation.hsl_source || chart.house_calculation.mode)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
