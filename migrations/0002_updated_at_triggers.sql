-- ============================================================================
-- ASTRO VEGA V1.7 - NEON POSTGRESQL MIGRATION 0002
-- Triggers automáticos para atualização de updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practitioner_profiles_set_updated_at ON public.practitioner_profiles;
CREATE TRIGGER practitioner_profiles_set_updated_at
BEFORE UPDATE ON public.practitioner_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS clients_set_updated_at ON public.clients;
CREATE TRIGGER clients_set_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS charts_set_updated_at ON public.charts;
CREATE TRIGGER charts_set_updated_at
BEFORE UPDATE ON public.charts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
