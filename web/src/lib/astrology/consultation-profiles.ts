import type { ChartResult, ComparisonResult, ConsultationProfileId, Subject } from './contracts';

export interface ConsultationProfileDefinition {
  id: ConsultationProfileId;
  label: string;
  description: string;
  requiredEngines: readonly ('vega_classic' | 'modern_swiss')[];
  producesComparison: boolean;
}

export const CONSULTATION_PROFILES: Record<ConsultationProfileId, ConsultationProfileDefinition> = Object.freeze({
  classic: {
    id: 'classic',
    label: 'Clássico Vega',
    description: 'Compatibilidade histórica Vega/Good Luck validada por engenharia reversa.',
    requiredEngines: ['vega_classic'],
    producesComparison: false,
  },
  modern: {
    id: 'modern',
    label: 'Precisão Atual',
    description: 'Efemérides Swiss atuais preservando as regras astrológicas validadas.',
    requiredEngines: ['modern_swiss'],
    producesComparison: false,
  },
  comparative: {
    id: 'comparative',
    label: 'Comparativo',
    description: 'Executa os dois motores e evidencia diferenças de posições, casas e aspectos.',
    requiredEngines: ['vega_classic', 'modern_swiss'],
    producesComparison: true,
  },
});

export interface ConsultationResult {
  profile: ConsultationProfileId;
  subject: Subject;
  classic_result?: ChartResult;
  modern_result?: ChartResult;
  comparison_result?: ComparisonResult;
}
