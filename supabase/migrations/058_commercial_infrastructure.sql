-- ============================================================
-- 058: Commercial Infrastructure — plans, trial, founder
-- Adds columns to tiendas for the new commercial model.
-- Backfills existing stores with safe defaults.
-- ============================================================

-- 1. Add new commercial columns to tiendas
ALTER TABLE public.tiendas
  ADD COLUMN IF NOT EXISTS plan_tipo TEXT NOT NULL DEFAULT 'emprendedor'
    CHECK (plan_tipo IN ('emprendedor', 'pro'));

ALTER TABLE public.tiendas
  ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (plan_status IN ('trial', 'active', 'grace', 'dashboard_suspended', 'catalog_suspended', 'deleted'));

ALTER TABLE public.tiendas
  ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.tiendas
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

ALTER TABLE public.tiendas
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 2. Backfill existing stores
--
-- Strategy:
--   plan_tipo:  All existing stores have plan_nivel = 'basico' → 'emprendedor'
--   plan_status:
--     - soft_deleted_at IS NOT NULL → 'deleted'
--     - fecha_bloqueo_panel <= now() → 'dashboard_suspended' (already blocked)
--     - otherwise → 'trial' (safe default, no enforcement impact)
--   is_founder:  false for all existing stores (founder is set manually from PCC)
--   trial_started_at:  fecha_creacion
--   trial_ends_at:     COALESCE(fecha_vencimiento, fecha_creacion + 7 days)
--
-- NOTE: This is a conservative backfill. No existing store is incorrectly set to
-- 'active' or 'grace'. Stores that should be 'active' (paid via tokens) will
-- remain in 'trial' until PCC manually updates them. This avoids accidentally
-- suspending or expiring any store during migration.

UPDATE public.tiendas
SET
  plan_tipo = 'emprendedor',
  plan_status = CASE
    WHEN soft_deleted_at IS NOT NULL THEN 'deleted'
    WHEN fecha_bloqueo_panel IS NOT NULL AND fecha_bloqueo_panel <= now() THEN 'dashboard_suspended'
    ELSE 'trial'
  END,
  is_founder = false,
  trial_started_at = fecha_creacion,
  trial_ends_at = COALESCE(fecha_vencimiento, fecha_creacion + INTERVAL '7 days')
WHERE trial_started_at IS NULL;

-- 3. Make default values explicit (avoid relying on DEFAULT for backfill)
ALTER TABLE public.tiendas
  ALTER COLUMN plan_tipo SET DEFAULT 'emprendedor',
  ALTER COLUMN plan_status SET DEFAULT 'trial',
  ALTER COLUMN is_founder SET DEFAULT false;
