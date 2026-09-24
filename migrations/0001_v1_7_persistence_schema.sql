-- ============================================================================
-- ASTRO VEGA V1.7 - NEON POSTGRESQL MIGRATION 0001
-- Multi-tenant, Auditável, RLS Habilitado (Defesa em Profundidade)
-- ============================================================================

-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_session_jwt;

-- ============================================================================
-- 2. Tabela de Perfis Profissionais (Astrólogo / Praticante)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.practitioner_profiles (
    user_id uuid PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    display_name text NOT NULL,
    professional_title text NULL,
    email text NULL,
    phone text NULL,
    website text NULL,
    default_profile_key text NOT NULL DEFAULT 'comparative',
    default_house_system text NOT NULL DEFAULT 'T',
    default_zodiac text NOT NULL DEFAULT 'tropical',
    app_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT practitioner_profiles_profile_key_chk 
        CHECK (default_profile_key IN ('vega_classic', 'modern_swiss', 'comparative')),
    CONSTRAINT practitioner_profiles_house_system_chk 
        CHECK (default_house_system = 'T'),
    CONSTRAINT practitioner_profiles_zodiac_chk 
        CHECK (default_zodiac = 'tropical')
);

-- ============================================================================
-- 3. Tabela de Consulentes (Clients)
-- Simplificada: dados de nascimento/localização opcionais de conveniência.
-- Valores derivados de cálculo pertencem exclusivamente ao snapshot em charts.
-- Integridade multi-tenant garantida por UNIQUE (id, owner_id).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NULL,
    phone text NULL,
    notes text NULL,
    gender text NULL,
    
    -- Dados de nascimento/localização opcionais de conveniência
    birth_date date NULL,
    birth_time_local time without time zone NULL,
    birth_timezone text NULL,
    birth_city text NULL,
    birth_state_code text NULL,
    birth_country_code text NULL,
    latitude numeric(8, 5) NULL,
    longitude numeric(8, 5) NULL,
    altitude_meters numeric(6, 1) NULL DEFAULT 0.0,
    
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Chave composta única para integridade multi-tenant de chave estrangeira
    CONSTRAINT clients_id_owner_uq UNIQUE (id, owner_id),
    CONSTRAINT clients_gender_chk 
        CHECK (gender IN ('male', 'female', 'other', 'unknown') OR gender IS NULL),
    CONSTRAINT clients_lat_chk 
        CHECK (latitude IS NULL OR latitude BETWEEN -90.0 AND 90.0),
    CONSTRAINT clients_lon_chk 
        CHECK (longitude IS NULL OR longitude BETWEEN -180.0 AND 180.0)
);

-- ============================================================================
-- 4. Tabela de Mapas Astrais (Charts)
-- Snapshot astronômico de entrada 100% OBRIGATÓRIO (auditoria matemática).
-- chart_type estritamente restrito a 'natal' na V1.
-- 3 Snapshots JSONB explícitos: classic_result, modern_result, comparison_result.
-- FK Composta (client_id, owner_id) com ON DELETE SET NULL (client_id).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.charts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    client_id uuid NULL,
    
    chart_name text NOT NULL,
    chart_type text NOT NULL DEFAULT 'natal',
    profile_key text NOT NULL DEFAULT 'comparative',
    
    -- Versionamento independente de motores e schemas
    schema_version integer NOT NULL DEFAULT 1,
    engine_version text NOT NULL DEFAULT '1.7',
    profile_version text NOT NULL DEFAULT 'VEGA_GOODLUCK_PROFILE_V1',
    calculation_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    
    -- Snapshot congelado de entrada astronômica para auditoria reprodutível (OBRIGATÓRIO)
    calc_date date NOT NULL,
    calc_time_local time without time zone NOT NULL,
    calc_timezone text NOT NULL,
    calc_utc timestamptz NOT NULL,
    utc_offset_minutes smallint NOT NULL,
    utc_offset_hours numeric(4,2) GENERATED ALWAYS AS (ROUND(utc_offset_minutes::numeric / 60.0, 2)) STORED,
    latitude numeric(8, 5) NOT NULL,
    longitude numeric(8, 5) NOT NULL,
    altitude_meters numeric(6, 1) NOT NULL DEFAULT 0.0,
    house_system text NOT NULL DEFAULT 'T',
    zodiac text NOT NULL DEFAULT 'tropical',
    
    -- Parâmetros intermediários de tempo astronômico calculados
    julian_day_utc double precision NOT NULL,
    delta_t_seconds double precision NULL,
    sidereal_time_armc double precision NULL,
    
    -- Três Snapshots JSONB Explícitos
    classic_result jsonb NULL,
    modern_result jsonb NULL,
    comparison_result jsonb NULL,
    
    notes text NULL,
    tags text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- FK Composta multi-tenant estrita: impede que chart do owner A aponte para client do owner B
    CONSTRAINT charts_client_owner_fk 
        FOREIGN KEY (client_id, owner_id) 
        REFERENCES public.clients(id, owner_id) 
        ON DELETE SET NULL (client_id),

    -- Restrições de integridade astronômica e escopo da V1
    CONSTRAINT charts_chart_type_chk 
        CHECK (chart_type = 'natal'),
    CONSTRAINT charts_profile_key_chk 
        CHECK (profile_key IN ('vega_classic', 'modern_swiss', 'comparative')),
    CONSTRAINT charts_house_system_chk 
        CHECK (house_system = 'T'),
    CONSTRAINT charts_zodiac_chk 
        CHECK (zodiac = 'tropical'),
    CONSTRAINT charts_lat_chk 
        CHECK (latitude BETWEEN -90.0 AND 90.0),
    CONSTRAINT charts_lon_chk 
        CHECK (longitude BETWEEN -180.0 AND 180.0),
    CONSTRAINT charts_utc_offset_min_chk 
        CHECK (utc_offset_minutes BETWEEN -840 AND 840),
        
    -- Validação de consistência dos snapshots conforme o perfil consultado
    CONSTRAINT charts_profile_payloads_chk CHECK (
        (profile_key = 'vega_classic' AND classic_result IS NOT NULL) OR
        (profile_key = 'modern_swiss' AND modern_result IS NOT NULL) OR
        (profile_key = 'comparative' AND classic_result IS NOT NULL AND modern_result IS NOT NULL AND comparison_result IS NOT NULL)
    )
);

-- ============================================================================
-- 5. Estratégia de Índices Compostos e Otimizados
-- ============================================================================

CREATE INDEX IF NOT EXISTS practitioner_profiles_email_idx 
    ON public.practitioner_profiles (email);

CREATE INDEX IF NOT EXISTS clients_owner_name_idx 
    ON public.clients (owner_id, name);
CREATE INDEX IF NOT EXISTS clients_owner_created_idx 
    ON public.clients (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS charts_owner_engine_schema_idx 
    ON public.charts (owner_id, engine_version, schema_version);
CREATE INDEX IF NOT EXISTS charts_owner_profile_idx 
    ON public.charts (owner_id, profile_key);
CREATE INDEX IF NOT EXISTS charts_client_created_idx 
    ON public.charts (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS charts_owner_created_idx 
    ON public.charts (owner_id, created_at DESC);

-- ============================================================================
-- 6. Políticas de Row-Level Security (RLS) — Defesa em Profundidade
-- Forma Canônica Otimizada: (SELECT auth.user_id())::uuid = owner_id
-- ============================================================================

ALTER TABLE public.practitioner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

ALTER TABLE public.charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charts FORCE ROW LEVEL SECURITY;

-- 6.1. Practitioner Profiles
DROP POLICY IF EXISTS practitioner_profiles_isolation_policy ON public.practitioner_profiles;
CREATE POLICY practitioner_profiles_isolation_policy ON public.practitioner_profiles
    FOR ALL
    USING (
        (SELECT auth.user_id())::uuid = user_id
    )
    WITH CHECK (
        (SELECT auth.user_id())::uuid = user_id
    );

-- 6.2. Clients
DROP POLICY IF EXISTS clients_isolation_policy ON public.clients;
CREATE POLICY clients_isolation_policy ON public.clients
    FOR ALL
    USING (
        (SELECT auth.user_id())::uuid = owner_id
    )
    WITH CHECK (
        (SELECT auth.user_id())::uuid = owner_id
    );

-- 6.3. Charts
DROP POLICY IF EXISTS charts_isolation_policy ON public.charts;
CREATE POLICY charts_isolation_policy ON public.charts
    FOR ALL
    USING (
        (SELECT auth.user_id())::uuid = owner_id
    )
    WITH CHECK (
        (SELECT auth.user_id())::uuid = owner_id
    );
