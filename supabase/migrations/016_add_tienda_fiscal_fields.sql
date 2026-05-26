-- ============================================================
-- 016: Add fiscal fields (direccion, rnc) to tiendas table
-- ============================================================

ALTER TABLE public.tiendas ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE public.tiendas ADD COLUMN IF NOT EXISTS rnc TEXT;
