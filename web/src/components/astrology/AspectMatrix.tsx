'use client';

import React from 'react';
import type { ChartResult } from '@/lib/astrology/contracts';

interface AspectMatrixProps {
  chart: ChartResult;
}

const BODIES_ORDER = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter',
  'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Node', 'Lilith', 'Chiron', 'ASC', 'MC', 'Fortune'
];

export function AspectMatrix({ chart }: AspectMatrixProps) {
  // Map aspects by pair key
  const aspectMap = new Map<string, { glyph: string; orb: number; nature: string }>();

  chart.aspects.forEach(asp => {
    aspectMap.set(`${asp.a}-${asp.b}`, { glyph: asp.glyph, orb: asp.orb, nature: asp.nature });
    aspectMap.set(`${asp.b}-${asp.a}`, { glyph: asp.glyph, orb: asp.orb, nature: asp.nature });
  });

  return (
    <div style={{ overflowX: 'auto', padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>Matriz Triangular de Aspectos</h3>
      <table style={{ borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
        <thead>
          <tr>
            <th style={{ padding: '6px', border: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
            {BODIES_ORDER.map(b => {
              const pt = chart.points[b];
              return (
                <th key={`col-${b}`} style={{ padding: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', minWidth: '32px' }}>
                  {pt?.glyph || b.substring(0, 2)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {BODIES_ORDER.map((rowBody, rIdx) => {
            const rowPt = chart.points[rowBody];
            return (
              <tr key={`row-${rowBody}`}>
                <td style={{ padding: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 'bold' }}>
                  {rowPt?.glyph || rowBody.substring(0, 2)}
                </td>
                {BODIES_ORDER.map((colBody, cIdx) => {
                  if (cIdx >= rIdx) {
                    return <td key={`cell-${rowBody}-${colBody}`} style={{ border: '1px solid #f1f5f9', background: '#f8fafc' }}></td>;
                  }

                  const match = aspectMap.get(`${rowBody}-${colBody}`);
                  if (!match) {
                    return <td key={`cell-${rowBody}-${colBody}`} style={{ border: '1px solid #e2e8f0' }}></td>;
                  }

                  let color = '#64748b';
                  if (match.nature === 'harmonic') color = '#2563eb';
                  if (match.nature === 'tense') color = '#ef4444';
                  if (match.glyph === '☌') color = '#10b981';

                  return (
                    <td
                      key={`cell-${rowBody}-${colBody}`}
                      title={`${rowBody} - ${colBody}: orb ${match.orb.toFixed(1)}°`}
                      style={{
                        padding: '4px',
                        border: '1px solid #e2e8f0',
                        color,
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ fontSize: '13px' }}>{match.glyph}</div>
                      <div style={{ fontSize: '9px', fontWeight: 'normal', color: '#94a3b8' }}>{match.orb.toFixed(1)}°</div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
