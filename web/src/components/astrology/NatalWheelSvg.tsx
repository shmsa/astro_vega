'use client';

import React from 'react';
import type { ChartResult } from '@/lib/astrology/contracts';
import { formatZodiacPrecise } from '@/lib/astrology/format';


interface NatalWheelSvgProps {
  chart: ChartResult;
  size?: number;
}

const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const ZODIAC_COLORS = ['#ef4444', '#10b981', '#3b82f6', '#06b6d4', '#f59e0b', '#84cc16', '#6366f1', '#8b5cf6', '#ec4899', '#64748b', '#0ea5e9', '#14b8a6'];

export function NatalWheelSvg({ chart, size = 640 }: NatalWheelSvgProps) {
  const center = size / 2;
  const radius = size * 0.45;
  const innerRadius = radius * 0.72;
  const houseInnerRadius = innerRadius * 0.55;
  const ascendantAngle = chart.ascendant;

  // Coordinate conversion: Ascendant is on the 9 o'clock (180°) position standard in western wheels
  function toSvgCoords(longitude: number, r: number) {
    // Standard astrological orientation: ASC at 180° (west), counter-clockwise signs
    const deg = (180 - (longitude - ascendantAngle) + 360) % 360;
    const rad = (deg * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center - r * Math.sin(rad),
    };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ background: '#ffffff', borderRadius: '50%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
      >
        {/* Outer Wheel Circles */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#cbd5e1" strokeWidth="2" />
        <circle cx={center} cy={center} r={innerRadius} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx={center} cy={center} r={houseInnerRadius} fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
        <circle cx={center} cy={center} r={radius * 0.2} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />

        {/* 12 Zodiac Segments (30° each) */}
        {ZODIAC_SYMBOLS.map((symbol, i) => {
          const startLon = i * 30;
          const midLon = startLon + 15;
          const pOuter = toSvgCoords(startLon, radius);
          const pInner = toSvgCoords(startLon, innerRadius);
          const pText = toSvgCoords(midLon, (radius + innerRadius) / 2);

          return (
            <g key={`sign-${i}`}>
              <line x1={pInner.x} y1={pInner.y} x2={pOuter.x} y2={pOuter.y} stroke="#94a3b8" strokeWidth="1" />
              <text
                x={pText.x}
                y={pText.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="18"
                fontWeight="bold"
                fill={ZODIAC_COLORS[i]}
              >
                {symbol}
              </text>
            </g>
          );
        })}

        {/* 12 House Cusps (Topocentric Polich-Page) */}
        {chart.cusps.map((cuspLon, idx) => {
          const pCenter = toSvgCoords(cuspLon, houseInnerRadius);
          const pPerimeter = toSvgCoords(cuspLon, innerRadius);
          const houseNum = idx + 1;
          const isAngle = [1, 4, 7, 10].includes(houseNum);
          const nextCusp = chart.cusps[(idx + 1) % 12];
          const span = ((nextCusp - cuspLon + 360) % 360);
          const midLon = (cuspLon + span / 2) % 360;
          const pNum = toSvgCoords(midLon, (houseInnerRadius + radius * 0.2) / 2);

          return (
            <g key={`cusp-${houseNum}`}>
              <title>{`Casa ${houseNum}: ${formatZodiacPrecise(cuspLon)} (${cuspLon.toFixed(2)}°)`}</title>
              <line
                x1={pCenter.x}
                y1={pCenter.y}
                x2={pPerimeter.x}
                y2={pPerimeter.y}
                stroke={isAngle ? '#2563eb' : '#94a3b8'}
                strokeWidth={isAngle ? '2.5' : '1'}
                strokeDasharray={isAngle ? undefined : '2,2'}
              />
              <text
                x={pNum.x}
                y={pNum.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="11"
                fill="#64748b"
                fontWeight="600"
              >
                {houseNum}
              </text>
            </g>
          );
        })}

        {/* Planet Aspect Lines in Center */}
        {chart.aspects.map((asp, idx) => {
          const p1 = chart.points[asp.a];
          const p2 = chart.points[asp.b];
          if (!p1 || !p2) return null;
          const coord1 = toSvgCoords(p1.longitude, radius * 0.2);
          const coord2 = toSvgCoords(p2.longitude, radius * 0.2);

          let strokeColor = '#94a3b8';
          if (asp.nature === 'harmonic') strokeColor = '#2563eb'; // blue
          if (asp.nature === 'tense') strokeColor = '#ef4444';    // red
          if (asp.type === 'conjunction') strokeColor = '#10b981'; // green

          return (
            <line
              key={`aspect-line-${idx}`}
              x1={coord1.x}
              y1={coord1.y}
              x2={coord2.x}
              y2={coord2.y}
              stroke={strokeColor}
              strokeWidth="0.8"
              opacity="0.6"
            />
          );
        })}

        {/* Planets / Bodies */}
        {Object.entries(chart.points).map(([key, point]) => {
          if (['ASC', 'MC', 'Fortune'].includes(key)) return null;
          const ptCoords = toSvgCoords(point.longitude, (innerRadius + houseInnerRadius) / 2);

          return (
            <g key={`planet-${key}`} transform={`translate(${ptCoords.x}, ${ptCoords.y})`}>
              <title>{`${point.name}: ${formatZodiacPrecise(point.longitude, { retrograde: point.retrograde })}`}</title>
              <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#334155" strokeWidth="1" />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="12"
                fontWeight="bold"
                fill="#1e293b"
              >
                {point.glyph || key.substring(0, 2)}
              </text>
            </g>
          );
        })}

        {/* Ascendant & Midheaven Axis Labels */}
        {(() => {
          const ascCoord = toSvgCoords(chart.ascendant, radius * 1.05);
          const mcCoord = toSvgCoords(chart.midheaven, radius * 1.05);
          return (
            <>
              <text x={ascCoord.x} y={ascCoord.y} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="bold" fill="#2563eb">
                AC
              </text>
              <text x={mcCoord.x} y={mcCoord.y} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="bold" fill="#2563eb">
                MC
              </text>
            </>
          );
        })()}
      </svg>

      <div style={{ marginTop: '14px', fontSize: '13px', color: '#334155', textAlign: 'center', lineHeight: '1.6' }}>
        <div>
          ASC: <strong style={{ color: '#1e293b' }}>{formatZodiacPrecise(chart.ascendant)}</strong>
          <span style={{ color: '#94a3b8', fontSize: '11.5px', marginLeft: '4px' }}>({chart.ascendant.toFixed(2)}°)</span>
          {' '}&bull;{' '}
          MC: <strong style={{ color: '#1e293b' }}>{formatZodiacPrecise(chart.midheaven)}</strong>
          <span style={{ color: '#94a3b8', fontSize: '11.5px', marginLeft: '4px' }}>({chart.midheaven.toFixed(2)}°)</span>
        </div>
        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
          Sistema: Topocêntrico (Polich/Page) &bull; Zodíaco: Tropical
        </div>
      </div>
    </div>
  );
}

