/**
 * Utilitário de Apresentação e Formatação Astrológica
 * 
 * Salvaguarda 2: Mantém math.ts 100% congelado e intocado.
 * Todas as rotinas de exibição, notação zodiacal profissional com minutos/segundos,
 * representação das casas interpretativas Vega e parsing de HSL residem aqui.
 */

import { norm360, roundArcminute, SIGNS_PT, SIGNS } from './math';

export function roundArcsecond(longitude: number): [number, number, number, number] {
  const lon = norm360(longitude);
  const totalSeconds = Math.floor(lon * 3600 + 0.5) % (360 * 3600);
  const sign = Math.floor(totalSeconds / (30 * 3600));
  const within = totalSeconds % (30 * 3600);
  const deg = Math.floor(within / 3600);
  const min = Math.floor((within % 3600) / 60);
  const sec = within % 60;
  return [sign, deg, min, sec];
}

export interface FormatZodiacOptions {
  includeSeconds?: boolean;
  retrograde?: boolean;
  portuguese?: boolean;
}

/**
 * Notação zodiacal profissional para eixos (ASC/MC), cúspides e pontos planetários.
 * Ex: "14°05' Áries", "12°03' Capricórnio", ou "14°05'22\" Áries"
 */
export function formatZodiacPrecise(
  longitude: number,
  options: FormatZodiacOptions = {}
): string {
  const { includeSeconds = false, retrograde = false, portuguese = true } = options;
  if (!includeSeconds) {
    const [s, d, m] = roundArcminute(longitude);
    const sign = portuguese ? SIGNS_PT[s] : SIGNS[s];
    const dStr = String(d).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    return `${dStr}°${mStr}' ${sign}${retrograde ? ' R' : ''}`;
  }

  const [s, d, m, sec] = roundArcsecond(longitude);
  const sign = portuguese ? SIGNS_PT[s] : SIGNS[s];
  const dStr = String(d).padStart(2, '0');
  const mStr = String(m).padStart(2, '0');
  const secStr = `${String(sec).padStart(2, '0')}" `;
  return `${dStr}°${mStr}'${secStr}${sign}${retrograde ? ' R' : ''}`;
}

/**
 * Regra interpretativa de antecipação de cúspides Vega:
 * 10° antes das cúspides angulares (1, 4, 7, 10) e 5° antes das demais.
 * O motor já produz geometric_house e interpretive_house.
 */
export interface HouseDisplayInfo {
  text: string;
  badge: string;
  hasAnticipation: boolean;
  geometric: number | null;
  interpretive: number | null;
  explanation: string;
}

export function formatHouseDisplay(
  geometricHouse: number | null,
  interpretiveHouse: number | null
): HouseDisplayInfo {
  if (geometricHouse == null && interpretiveHouse == null) {
    return {
      text: '—',
      badge: '—',
      hasAnticipation: false,
      geometric: null,
      interpretive: null,
      explanation: 'Sem casa atribuída',
    };
  }

  const geom = geometricHouse ?? interpretiveHouse!;
  const interp = interpretiveHouse ?? geometricHouse!;
  const hasAnticipation = geom !== interp;

  if (hasAnticipation) {
    return {
      text: `Casa ${geom} → ${interp}`,
      badge: `${geom}/${interp}`,
      hasAnticipation: true,
      geometric: geom,
      interpretive: interp,
      explanation: `Geométrica: ${geom} | Interpretativa: ${interp} (regra Vega de antecipação)`,
    };
  }

  return {
    text: `Casa ${geom}`,
    badge: `${geom}`,
    hasAnticipation: false,
    geometric: geom,
    interpretive: interp,
    explanation: `Casa ${geom}`,
  };
}

/**
 * Converte string no formato "HH:MM:SS" (ou "HH:MM") para horas decimais.
 * Ex: "18:52:24" -> 18.873333333333335
 */
export function parseHslString(v?: string | null): number | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  const parts = s.split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const sec = parts[2] ?? 0;
  return ((h + m / 60 + sec / 3600) % 24 + 24) % 24;
}

/**
 * Converte horas decimais para "HH:MM:SS".
 * Ex: 18.873333333333335 -> "18:52:24"
 */
export function formatHslString(hours?: number | null): string {
  if (hours == null || Number.isNaN(hours)) return '—';
  const totalSeconds = Math.round((((hours % 24) + 24) % 24) * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
