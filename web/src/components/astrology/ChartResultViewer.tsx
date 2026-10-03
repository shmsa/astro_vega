'use client';

import React, { useState } from 'react';
import type { ChartRecord } from '@/lib/services/charts';
import { NatalWheelSvg } from './NatalWheelSvg';
import { AspectMatrix } from './AspectMatrix';
import { TablesView } from './TablesView';
import { ComparativeView } from './ComparativeView';
import { FixedStarsView } from './FixedStarsView';

interface ChartResultViewerProps {
  chartRecord: ChartRecord;
}

export function ChartResultViewer({ chartRecord }: ChartResultViewerProps) {
  const [activeTab, setActiveTab] = useState<'classic' | 'modern' | 'comparative' | 'stars'>(
    chartRecord.profile_key === 'modern_swiss' ? 'modern' : (chartRecord.profile_key === 'vega_classic' ? 'classic' : 'comparative')
  );
  const [fullPrintMode, setFullPrintMode] = useState(false);


  const classic = chartRecord.classic_result;
  const modern = chartRecord.modern_result;
  const comparison = chartRecord.comparison_result;

  const displayDate = typeof chartRecord.calc_date === 'object' && chartRecord.calc_date !== null
    ? (chartRecord.calc_date as any).toISOString().split('T')[0]
    : String(chartRecord.calc_date || '');

  function handlePrintTab() {
    setFullPrintMode(false);
    setTimeout(() => {
      window.print();
    }, 50);
  }

  function handlePrintFullReport() {
    setFullPrintMode(true);
    setTimeout(() => {
      window.print();
    }, 100);
  }

  React.useEffect(() => {
    const handleAfterPrint = () => {
      setFullPrintMode(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

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
            {displayDate} às {chartRecord.calc_time_local} ({chartRecord.calc_timezone}) — Lat: {chartRecord.latitude}°, Lon: {chartRecord.longitude}°
            {Boolean(chartRecord.calculation_metadata?.historical_hsl) && (
              <span style={{ marginLeft: '8px', color: '#92400e', fontWeight: 600 }}>
                • HSL Histórica: {String(chartRecord.calculation_metadata.historical_hsl)}
              </span>
            )}
          </p>

        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }} className="no-print">
          <button
            onClick={handlePrintTab}
            title="Imprime exclusivamente a visão da aba selecionada no momento"
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
              gap: '6px',
              color: '#334155'
            }}
          >
            🖨️ Imprimir esta análise
          </button>

          {(comparison || (classic && modern)) && (
            <button
              onClick={handlePrintFullReport}
              title="Gera documento unificado contendo Identificação, Clássico Vega, Precisão Atual, Comparativo e Dados Técnicos"
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: '1px solid #2563eb',
                background: '#2563eb',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#ffffff'
              }}
            >
              📑 Relatório Comparativo Completo
            </button>
          )}

          {fullPrintMode && (
            <button
              onClick={() => setFullPrintMode(false)}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f1f5f9',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              ✕ Fechar Vista Completa
            </button>
          )}
        </div>
      </div>


      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          nav { display: none !important; }
        }
      ` }} />

      {fullPrintMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* 1. Identificação e Dados Natais */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>
              Relatório Comparativo Completo — Astro Vega
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '13px', color: '#334155' }}>
              <div><strong>Consulente / Mapa:</strong> {chartRecord.chart_name}</div>
              <div><strong>Data e Hora:</strong> {displayDate} às {chartRecord.calc_time_local}</div>
              <div><strong>Fuso / UTC:</strong> {chartRecord.calc_timezone} (UTC {chartRecord.utc_offset_hours > 0 ? `+${chartRecord.utc_offset_hours}` : chartRecord.utc_offset_hours})</div>
              <div><strong>Coordenadas:</strong> Lat: {chartRecord.latitude}°, Lon: {chartRecord.longitude}°</div>
              {Boolean(chartRecord.calculation_metadata?.historical_hsl) && (
                <div style={{ color: '#92400e', fontWeight: 600 }}>
                  <strong>HSL Histórica:</strong> {String(chartRecord.calculation_metadata.historical_hsl)} (override documental)
                </div>
              )}

              {chartRecord.tags && chartRecord.tags.length > 0 && (
                <div><strong>Tags:</strong> {chartRecord.tags.join(', ')}</div>
              )}
            </div>
            {chartRecord.notes && (
              <div style={{ marginTop: '12px', fontSize: '12.5px', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <strong>Observações Editoriais:</strong> {chartRecord.notes}
              </div>
            )}
          </div>

          {/* 2. Clássico Vega */}
          {classic && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', pageBreakBefore: 'always' }}>
              <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e40af' }}>
                  1. Clássico Vega (Efeméride Analítica Moshier + Topocêntrico)
                </h3>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
                gap: '24px',
                alignItems: 'start'
              }}>
                <NatalWheelSvg chart={classic} />
                <AspectMatrix chart={classic} />
              </div>
              <TablesView chart={classic} />
            </div>
          )}

          {/* 3. Precisão Atual */}
          {modern && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', pageBreakBefore: 'always' }}>
              <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e40af' }}>
                  2. Precisão Atual (Swiss Ephemeris Numérica + Topocêntrico)
                </h3>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
                gap: '24px',
                alignItems: 'start'
              }}>
                <NatalWheelSvg chart={modern} />
                <AspectMatrix chart={modern} />
              </div>
              <TablesView chart={modern} />
            </div>
          )}

          {/* 4. Comparativo */}
          {comparison && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', pageBreakBefore: 'always' }}>
              <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e40af' }}>
                  3. Análise Comparativa (Deltas de Longitude, Casas e Cúspides)
                </h3>
              </div>
              <ComparativeView comparison={comparison} />
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Abas Superiores Obrigatórias */}
          <div style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '2px'
          }} className="no-print">
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

            <button
              onClick={() => setActiveTab('stars')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                borderBottom: activeTab === 'stars' ? '3px solid #2563eb' : '3px solid transparent',
                background: 'none',
                color: activeTab === 'stars' ? '#2563eb' : '#64748b',
                transition: 'all 0.15s ease'
              }}
            >
              ⭐ Estrelas Fixas
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

          {activeTab === 'stars' && (
            <FixedStarsView chartRecord={chartRecord} />
          )}
        </>
      )}
    </div>
  );
}


