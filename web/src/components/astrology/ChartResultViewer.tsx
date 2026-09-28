'use client';

import React, { useState } from 'react';
import type { ChartRecord } from '@/lib/services/charts';
import { NatalWheelSvg } from './NatalWheelSvg';
import { AspectMatrix } from './AspectMatrix';
import { TablesView } from './TablesView';
import { ComparativeView } from './ComparativeView';

interface ChartResultViewerProps {
  chartRecord: ChartRecord;
}

export function ChartResultViewer({ chartRecord }: ChartResultViewerProps) {
  const [activeTab, setActiveTab] = useState<'classic' | 'modern' | 'comparative'>(
    chartRecord.profile_key === 'modern_swiss' ? 'modern' : (chartRecord.profile_key === 'vega_classic' ? 'classic' : 'comparative')
  );

  const classic = chartRecord.classic_result;
  const modern = chartRecord.modern_result;
  const comparison = chartRecord.comparison_result;

  function handlePrint() {
    window.print();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header com Ações */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>
            {chartRecord.chart_name}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            {chartRecord.calc_date} às {chartRecord.calc_time_local} ({chartRecord.calc_timezone}) — Lat: {chartRecord.latitude}°, Lon: {chartRecord.longitude}°
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handlePrint}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Abas Superiores Obrigatórias */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setActiveTab('classic')}
          disabled={!classic}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: classic ? 'pointer' : 'not-allowed',
            border: 'none',
            borderBottom: activeTab === 'classic' ? '3px solid #2563eb' : '3px solid transparent',
            background: 'none',
            color: activeTab === 'classic' ? '#2563eb' : (classic ? '#64748b' : '#cbd5e1'),
            transition: 'all 0.15s ease'
          }}
        >
          🏛️ Clássico Vega
        </button>

        <button
          onClick={() => setActiveTab('modern')}
          disabled={!modern}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: modern ? 'pointer' : 'not-allowed',
            border: 'none',
            borderBottom: activeTab === 'modern' ? '3px solid #2563eb' : '3px solid transparent',
            background: 'none',
            color: activeTab === 'modern' ? '#2563eb' : (modern ? '#64748b' : '#cbd5e1'),
            transition: 'all 0.15s ease'
          }}
        >
          🔬 Precisão Atual (Swiss)
        </button>

        <button
          onClick={() => setActiveTab('comparative')}
          disabled={!comparison}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: comparison ? 'pointer' : 'not-allowed',
            border: 'none',
            borderBottom: activeTab === 'comparative' ? '3px solid #2563eb' : '3px solid transparent',
            background: 'none',
            color: activeTab === 'comparative' ? '#2563eb' : (comparison ? '#64748b' : '#cbd5e1'),
            transition: 'all 0.15s ease'
          }}
        >
          ⚖️ Comparativo
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === 'classic' && classic && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
            gap: '24px',
            alignItems: 'start'
          }}>
            <NatalWheelSvg chart={classic} />
            <AspectMatrix chart={classic} />
          </div>
          <TablesView chart={classic} />
        </div>
      )}

      {activeTab === 'modern' && modern && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
            gap: '24px',
            alignItems: 'start'
          }}>
            <NatalWheelSvg chart={modern} />
            <AspectMatrix chart={modern} />
          </div>
          <TablesView chart={modern} />
        </div>
      )}

      {activeTab === 'comparative' && comparison && (
        <ComparativeView comparison={comparison} />
      )}
    </div>
  );
}
