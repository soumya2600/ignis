-- ============================================================
-- AGNIDRISHTI — Production-Ready Supabase SQL Schema
-- Run this directly in: Supabase Dashboard → SQL Editor → New Query
-- Compatible with Supabase PostgreSQL (No ORM required)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    avatar TEXT,
    phone TEXT,
    organization TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. FOREST REGIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.forest_regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    state TEXT,
    country TEXT,
    boundary_geojson JSONB,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    area DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. DISTRICTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    state TEXT,
    forest_region_id UUID REFERENCES public.forest_regions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. WEATHER LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weather_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    forest_region_id UUID REFERENCES public.forest_regions(id) ON DELETE CASCADE,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    wind_speed DOUBLE PRECISION,
    wind_direction TEXT,
    rainfall DOUBLE PRECISION,
    pressure DOUBLE PRECISION,
    uv_index DOUBLE PRECISION,
    weather_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. FIRE HOTSPOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fire_hotspots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    forest_region_id UUID REFERENCES public.forest_regions(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    brightness DOUBLE PRECISION,
    confidence DOUBLE PRECISION,
    satellite TEXT,
    acquired_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. RISK PREDICTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.risk_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    forest_region_id UUID REFERENCES public.forest_regions(id) ON DELETE CASCADE,
    risk_score DOUBLE PRECISION,
    risk_level TEXT,
    confidence DOUBLE PRECISION,
    ai_reason TEXT,
    recommendation TEXT,
    predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    forest_region_id UUID REFERENCES public.forest_regions(id) ON DELETE CASCADE,
    alert_level TEXT,
    message TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    pdf_url TEXT,
    generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. AI LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt TEXT,
    response TEXT,
    model TEXT,
    latency INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_risk_score ON public.risk_predictions(risk_score);

-- forest_region_id indexes
CREATE INDEX IF NOT EXISTS idx_districts_region ON public.districts(forest_region_id);
CREATE INDEX IF NOT EXISTS idx_weather_logs_region ON public.weather_logs(forest_region_id);
CREATE INDEX IF NOT EXISTS idx_fire_hotspots_region ON public.fire_hotspots(forest_region_id);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_region ON public.risk_predictions(forest_region_id);
CREATE INDEX IF NOT EXISTS idx_alerts_region ON public.alerts(forest_region_id);

-- created_at indexes
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);
CREATE INDEX IF NOT EXISTS idx_forest_regions_created_at ON public.forest_regions(created_at);
CREATE INDEX IF NOT EXISTS idx_weather_logs_created_at ON public.weather_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_fire_hotspots_created_at ON public.fire_hotspots(created_at);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_created_at ON public.risk_predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON public.ai_logs(created_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Disable RLS during development to allow easy querying without authentication
-- To enable RLS in production, run:
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Then define policies, e.g.:
-- CREATE POLICY "Allow read access to all users" ON public.users FOR SELECT USING (true);
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.forest_regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fire_hotspots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- SAMPLE DATA INSERTION
-- ============================================================
-- Insert 5 Forest Regions
INSERT INTO public.forest_regions (id, name, state, country, latitude, longitude, area) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Similipal Forest', 'Odisha', 'India', 21.93, 86.44, 2750),
    ('22222222-2222-2222-2222-222222222222', 'Bandipur Reserve', 'Karnataka', 'India', 11.66, 76.62, 874),
    ('33333333-3333-3333-3333-333333333333', 'Amazon Rainforest', 'Amazonas', 'Brazil', -3.46, -62.21, 5500000),
    ('44444444-4444-4444-4444-444444444444', 'Yosemite Park', 'California', 'USA', 37.86, -119.53, 3029),
    ('55555555-5555-5555-5555-555555555555', 'Black Forest', 'Baden-Württemberg', 'Germany', 48.33, 8.24, 6009)
ON CONFLICT DO NOTHING;

-- Insert 10 Districts
INSERT INTO public.districts (name, state, forest_region_id) VALUES
    ('Mayurbhanj', 'Odisha', '11111111-1111-1111-1111-111111111111'),
    ('Keonjhar', 'Odisha', '11111111-1111-1111-1111-111111111111'),
    ('Chamarajanagar', 'Karnataka', '22222222-2222-2222-2222-222222222222'),
    ('Mysuru', 'Karnataka', '22222222-2222-2222-2222-222222222222'),
    ('Manaus', 'Amazonas', '33333333-3333-3333-3333-333333333333'),
    ('Tefé', 'Amazonas', '33333333-3333-3333-3333-333333333333'),
    ('Mariposa', 'California', '44444444-4444-4444-4444-444444444444'),
    ('Tuolumne', 'California', '44444444-4444-4444-4444-444444444444'),
    ('Freiburg', 'Baden-Württemberg', '55555555-5555-5555-5555-555555555555'),
    ('Calw', 'Baden-Württemberg', '55555555-5555-5555-5555-555555555555');

-- Insert 20 Weather Logs (4 per region)
DO $$
DECLARE
    region_ids UUID[] := ARRAY['11111111-1111-1111-1111-111111111111'::UUID, '22222222-2222-2222-2222-222222222222'::UUID, '33333333-3333-3333-3333-333333333333'::UUID, '44444444-4444-4444-4444-444444444444'::UUID, '55555555-5555-5555-5555-555555555555'::UUID];
    r_id UUID;
    i INT;
    j INT;
BEGIN
    FOR i IN 1..5 LOOP
        r_id := region_ids[i];
        FOR j IN 1..4 LOOP
            INSERT INTO public.weather_logs (forest_region_id, temperature, humidity, wind_speed, wind_direction, rainfall, pressure, uv_index, weather_time)
            VALUES (r_id, 20 + random() * 15, 30 + random() * 40, random() * 20, 'NW', random() * 10, 1010 + random() * 10, random() * 8, NOW() - (j || ' hours')::INTERVAL);
        END LOOP;
    END LOOP;
END $$;

-- Insert 15 Fire Hotspots (3 per region)
DO $$
DECLARE
    region_ids UUID[] := ARRAY['11111111-1111-1111-1111-111111111111'::UUID, '22222222-2222-2222-2222-222222222222'::UUID, '33333333-3333-3333-3333-333333333333'::UUID, '44444444-4444-4444-4444-444444444444'::UUID, '55555555-5555-5555-5555-555555555555'::UUID];
    r_id UUID;
    i INT;
    j INT;
BEGIN
    FOR i IN 1..5 LOOP
        r_id := region_ids[i];
        FOR j IN 1..3 LOOP
            INSERT INTO public.fire_hotspots (forest_region_id, latitude, longitude, brightness, confidence, satellite, acquired_at)
            VALUES (r_id, random() * 40, random() * 40, 300 + random() * 100, 50 + random() * 50, 'MODIS', NOW() - (j || ' days')::INTERVAL);
        END LOOP;
    END LOOP;
END $$;

-- Insert 10 Risk Predictions (2 per region)
DO $$
DECLARE
    region_ids UUID[] := ARRAY['11111111-1111-1111-1111-111111111111'::UUID, '22222222-2222-2222-2222-222222222222'::UUID, '33333333-3333-3333-3333-333333333333'::UUID, '44444444-4444-4444-4444-444444444444'::UUID, '55555555-5555-5555-5555-555555555555'::UUID];
    r_id UUID;
    i INT;
    j INT;
BEGIN
    FOR i IN 1..5 LOOP
        r_id := region_ids[i];
        FOR j IN 1..2 LOOP
            INSERT INTO public.risk_predictions (forest_region_id, risk_score, risk_level, confidence, ai_reason, recommendation)
            VALUES (r_id, 30 + random() * 70, CASE WHEN random() > 0.5 THEN 'HIGH' ELSE 'LOW' END, 0.8 + random() * 0.2, 'High temp, low humidity', 'Dispatch patrol unit');
        END LOOP;
    END LOOP;
END $$;

-- Insert 5 Alerts (1 per region)
DO $$
DECLARE
    region_ids UUID[] := ARRAY['11111111-1111-1111-1111-111111111111'::UUID, '22222222-2222-2222-2222-222222222222'::UUID, '33333333-3333-3333-3333-333333333333'::UUID, '44444444-4444-4444-4444-444444444444'::UUID, '55555555-5555-5555-5555-555555555555'::UUID];
    r_id UUID;
    i INT;
BEGIN
    FOR i IN 1..5 LOOP
        r_id := region_ids[i];
        INSERT INTO public.alerts (forest_region_id, alert_level, message)
        VALUES (r_id, 'CRITICAL', 'Critical fire risk detected by AI model. Immediate action required.');
    END LOOP;
END $$;
