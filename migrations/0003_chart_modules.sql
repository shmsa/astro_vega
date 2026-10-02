-- Migration: 0003_chart_modules
-- Cria tabela public.chart_modules para módulos complementares do mapa natal.
-- Módulos: fixed_stars (Vega 7 Revival), e futuros (partes árabes, etc.)
-- Versão: 1.0.0

-- ============================================================
-- Tabela: public.chart_modules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chart_modules (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id       UUID         NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  module_key     TEXT         NOT NULL CHECK (module_key ~ '^[a-z_]+$'),
  module_version TEXT         NOT NULL,
  config         JSONB        NOT NULL DEFAULT '{}',
  result         JSONB        NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Um mapa tem apenas um resultado por tipo de módulo
  UNIQUE (chart_id, module_key)
);

-- Índice para buscar módulos de um mapa rapidamente
CREATE INDEX IF NOT EXISTS chart_modules_chart_id_idx
  ON public.chart_modules (chart_id);

-- ============================================================
-- Row Level Security — alinhado com public.charts
-- Forma Canônica: (SELECT auth.user_id())::uuid
-- ============================================================
ALTER TABLE public.chart_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_modules FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chart_modules_isolation_policy ON public.chart_modules;
CREATE POLICY chart_modules_isolation_policy ON public.chart_modules
  FOR ALL
  USING (
    chart_id IN (
      SELECT id FROM public.charts
      WHERE owner_id = (SELECT auth.user_id())::uuid
    )
  )
  WITH CHECK (
    chart_id IN (
      SELECT id FROM public.charts
      WHERE owner_id = (SELECT auth.user_id())::uuid
    )
  );

-- ============================================================
-- Comentários de documentação
-- ============================================================
COMMENT ON TABLE public.chart_modules IS
  'Módulos complementares do mapa natal (Vega 7). Cada linha é o resultado de um módulo para um mapa específico.';

COMMENT ON COLUMN public.chart_modules.module_key IS
  'Identificador do módulo. Valores definidos: fixed_stars.';

COMMENT ON COLUMN public.chart_modules.module_version IS
  'Versão do motor do módulo no momento do cálculo (ex: 1.0.0).';

COMMENT ON COLUMN public.chart_modules.config IS
  'Configuração usada no cálculo (ex: orbes). JSONB para retrocompatibilidade.';

COMMENT ON COLUMN public.chart_modules.result IS
  'Resultado completo do módulo em JSONB. Schema definido por FixedStarsResult (TypeScript).';
