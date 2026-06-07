-- Migration 059: Drop plan_nivel from tiendas
--
-- plan_nivel (basico | pro | ilimitado) is fully superseded by:
--   plan_tipo (emprendedor | pro)
--   plan_status (trial | active | grace | dashboard_suspended | catalog_suspended | deleted)
--   is_founder (boolean)
--
-- Migration 058 backfilled all existing rows, so no data loss.
-- All code references to plan_nivel have been removed in Sprint 4C.

ALTER TABLE public.tiendas DROP COLUMN IF EXISTS plan_nivel;
