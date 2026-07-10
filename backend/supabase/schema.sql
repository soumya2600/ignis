-- ============================================================
-- IGNIS.AI — Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS (mirrors auth.users via trigger)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT UNIQUE NOT NULL,
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'forest_officer'
                   CHECK (role IN ('admin', 'forest_officer', 'researcher', 'dma')),
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-insert into public.users on new Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'forest_officer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FOREST REGIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.forest_regions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  country      TEXT,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  area_km2     DOUBLE PRECISION,
  risk_score   DOUBLE PRECISION DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forest_regions_risk ON public.forest_regions(risk_score DESC);

-- Seed default regions
INSERT INTO public.forest_regions (name, country, lat, lng) VALUES
  ('Similipal Forest', 'India',  21.93,   86.44),
  ('Bandipur Reserve', 'India',  11.66,   76.62),
  ('Amazon Rainforest','Brazil', -3.46,  -62.21),
  ('Yosemite Park',   'USA',    37.86, -119.53)
ON CONFLICT DO NOTHING;

-- ============================================================
-- DISTRICTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.districts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  state           TEXT,
  country         TEXT,
  forest_region_id UUID REFERENCES public.forest_regions(id) ON DELETE SET NULL,
  population      BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WEATHER LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weather_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forest_region_id UUID REFERENCES public.forest_regions(id) ON DELETE CASCADE,
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  temperature      DOUBLE PRECISION,
  humidity         DOUBLE PRECISION,
  rainfall         DOUBLE PRECISION,
  wind_speed       DOUBLE PRECISION,
  wind_direction   TEXT,
  ndvi             DOUBLE PRECISION,
  elevation        DOUBLE PRECISION,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_logs_region  ON public.weather_logs(forest_region_id);
CREATE INDEX IF NOT EXISTS idx_weather_logs_created ON public.weather_logs(created_at DESC);

-- ============================================================
-- FIRE HOTSPOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fire_hotspots (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forest_region_id UUID REFERENCES public.forest_regions(id) ON DELETE SET NULL,
  lat              DOUBLE PRECISION NOT NULL,
  lng              DOUBLE PRECISION NOT NULL,
  confidence       DOUBLE PRECISION NOT NULL DEFAULT 0,
  source           TEXT DEFAULT 'NASA_FIRMS',
  reported_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotspots_region     ON public.fire_hotspots(forest_region_id);
CREATE INDEX IF NOT EXISTS idx_hotspots_reported   ON public.fire_hotspots(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_hotspots_confidence ON public.fire_hotspots(confidence DESC);

-- ============================================================
-- RISK PREDICTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.risk_predictions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forest_region_id UUID REFERENCES public.forest_regions(id) ON DELETE SET NULL,
  risk_score       DOUBLE PRECISION NOT NULL,
  risk_category    TEXT NOT NULL CHECK (risk_category IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  confidence       DOUBLE PRECISION,
  reasons          TEXT[],
  feature_importance JSONB,
  telemetry_snapshot JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_region   ON public.risk_predictions(forest_region_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created  ON public.risk_predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_category ON public.risk_predictions(risk_category);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id UUID REFERENCES public.forest_regions(id) ON DELETE SET NULL,
  title     TEXT NOT NULL,
  message   TEXT NOT NULL,
  severity  TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  lat       DOUBLE PRECISION,
  lng       DOUBLE PRECISION,
  is_read   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read  ON public.alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created  ON public.alerts(created_at DESC);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  location     TEXT,
  file_url     TEXT,
  storage_path TEXT,
  created_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_created_by ON public.reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_created    ON public.reports(created_at DESC);

-- ============================================================
-- AI LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forest_name    TEXT,
  model_used     TEXT,
  input_payload  JSONB,
  output_payload JSONB,
  latency_ms     INTEGER,
  success        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_forest  ON public.ai_logs(forest_name);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON public.ai_logs(created_at DESC);

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key        TEXT UNIQUE NOT NULL,
  value      JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default settings
INSERT INTO public.settings (key, value) VALUES
  ('polling_interval_ms', '10000'),
  ('alert_threshold_high', '60'),
  ('alert_threshold_critical', '80'),
  ('max_alerts', '10')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- updated_at AUTO-UPDATE TRIGGER (applies to all tables)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','forest_regions','districts','fire_hotspots',
    'risk_predictions','alerts','reports','settings'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_%I_updated_at ON public.%I;
      CREATE TRIGGER set_%I_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forest_regions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fire_hotspots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings         ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Authenticated users can read public data
CREATE POLICY "authenticated_read_regions" ON public.forest_regions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_alerts" ON public.alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_predictions" ON public.risk_predictions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_weather" ON public.weather_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_hotspots" ON public.fire_hotspots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_settings" ON public.settings
  FOR SELECT TO authenticated USING (true);

-- Service role bypass (backend uses service key, bypasses RLS automatically)
-- No explicit policy needed for service role.

-- Reports: users see their own
CREATE POLICY "reports_read_own" ON public.reports
  FOR SELECT USING (auth.uid() = created_by);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to reports bucket
CREATE POLICY "reports_bucket_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports');

CREATE POLICY "reports_bucket_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
