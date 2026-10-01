'use client';

import React from 'react';
import type { ComparisonResult } from '@/lib/astrology/contracts';
import { formatHouseDisplay } from '@/lib/astrology/format';

interface ComparativeViewProps {
  comparison: ComparisonResult;
}

export function ComparativeView({ comparison }: ComparativeViewProps) {
  const points = Object.values(comparison.points);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Resumo dos Motores */}
      <div style={{ background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', padding: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#1e40af' }}>
          Comparativo: Clássico Vega vs. Precisão Atual (Swiss Ephemeris)
        </h3>
        <p style={{ margin: '0', fontSize: '13px', color: '#1e3a8a', lineHeight: '1.5' }}>
          O modo comparativo avalia lado a lado os resultados dos dois motores astronômicos sob os mesmos critérios topocêntricos, evidenciando variações de segundos de arco em posições e cúspides decorrentes da evolução das efemérides analíticas para efemérides numéricas de alta precisão.
        </p>
      </div>

      {/* 2. Tabela de Comparação de Posições */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
          Deltas de Longitude dos Pontos Planetários e Casas
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Ponto</th>
                <th style={{ padding: '8px' }}>Clássico Vega</th>
                <th style={{ padding: '8px' }}>Precisão Atual</th>
                <th style={{ padding: '8px' }}>Casas (G/I)</th>
                <th style={{ padding: '8px' }}>Delta (Graus)</th>
                <th style={{ padding: '8px' }}>Delta (Minutos de Arco)</th>
                <th style={{ padding: '8px' }}>Mesmo Minuto?</th>
              </tr>
            </thead>
            <tbody>
              {points.map((pt) => {
                const classicHouse = formatHouseDisplay(pt.classic_house, pt.classic_interpretive_house);
                const modernHouse = formatHouseDisplay(pt.modern_house, pt.modern_interpretive_house);
                return (
                  <tr key={pt.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 500 }}>{pt.name}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{pt.classic_display}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{pt.modern_display}</td>
                    <td style={{ padding: '8px', fontSize: '12px' }}>
                      <span title={`Clássico: ${classicHouse.explanation}`} style={{ fontWeight: 600, color: '#1e293b' }}>
                        {classicHouse.badge}
                      </span>
                      {classicHouse.badge !== modernHouse.badge && (
                        <span style={{ color: '#ef4444', marginLeft: '6px' }} title={`Atual: ${modernHouse.explanation}`}>
                          (Atual: {modernHouse.badge})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px', color: Math.abs(pt.delta_degrees) > 0.05 ? '#ef4444' : '#64748b' }}>
                      {pt.delta_degrees > 0 ? `+${pt.delta_degrees.toFixed(4)}°` : `${pt.delta_degrees.toFixed(4)}°`}
                    </td>
                    <td style={{ padding: '8px', fontWeight: 600 }}>
                      {pt.delta_arcminutes.toFixed(2)}'
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: pt.same_display_minute ? '#dcfce7' : '#fee2e2',
                        color: pt.same_display_minute ? '#166534' : '#991b1b',
                      }}>
                        {pt.same_display_minute ? 'SIM' : 'NÃO'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* 3. Comparação de Cúspides */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
          Deltas das Cúspides das Casas (Topocêntrico)
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Casa</th>
                <th style={{ padding: '8px' }}>Clássico Vega</th>
                <th style={{ padding: '8px' }}>Precisão Atual</th>
                <th style={{ padding: '8px' }}>Delta Minutos</th>
                <th style={{ padding: '8px' }}>Mesmo Minuto?</th>
              </tr>
            </thead>
            <tbody>
              {comparison.cusps.map((c) => (
                <tr key={`comp-cusp-${c.house}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px', fontWeight: 600 }}>Casa {c.house}</td>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>{c.classic.toFixed(4)}°</td>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>{c.modern.toFixed(4)}°</td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{c.delta_arcminutes.toFixed(2)}'</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: c.same_display_minute ? '#dcfce7' : '#fee2e2',
                      color: c.same_display_minute ? '#166534' : '#991b1b',
                    }}>
                      {c.same_display_minute ? 'SIM' : 'NÃO'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Variações de Aspectos */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
          Aspectos Compartilhados e Exclusivos
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>
              Aspectos Idênticos em Ambos ({comparison.aspect_changes.same_count})
            </div>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Todos os aspectos principais conservam a mesma natureza e relacionamento de orbe.
            </p>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b', marginBottom: '8px' }}>
              Aspectos Exclusivos
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Clássico apenas: {comparison.aspect_changes.classic_only.length} | Atual apenas: {comparison.aspect_changes.modern_only.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
