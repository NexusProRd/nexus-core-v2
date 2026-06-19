-- ============================================================
-- 075: Add reserved_expires_at para expiración automática de RESERVED
--
-- Sprint 3G: Columna que almacena la fecha exacta en que un regalo
-- RESERVED debe expirar. Calculada al momento de la transición
-- pending → RESERVED usando gift_config.reserved_expires_days.
--
-- CLAIMED NO expira. No se crea claimed_expires_at.
-- ============================================================

-- ============================================================
-- 1. Add reserved_expires_at column
-- ============================================================
ALTER TABLE public.gift_experiences
  ADD COLUMN reserved_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.gift_experiences.reserved_expires_at IS
  'Fecha de expiración automática para regalos RESERVED. Se setea al aprobar (pending→RESERVED). Si NULL, el regalo no expira automáticamente.';

-- ============================================================
-- 2. Partial index for cron queries
-- ============================================================
CREATE INDEX idx_gift_experiences_reserved_expires
  ON public.gift_experiences(status, reserved_expires_at)
  WHERE status = 'RESERVED';

-- ============================================================
-- 3. Backfill for existing RESERVED gifts
-- Calcula reserved_expires_at desde created_at + gift_config.
-- Usa default 7 días si no hay gift_config.
-- ============================================================
UPDATE public.gift_experiences g
SET reserved_expires_at = g.created_at + COALESCE(
  (SELECT (t.gift_config->>'reserved_expires_days')::INT
   FROM public.tiendas t
   WHERE t.id = g.store_id),
  7
) * INTERVAL '1 day'
WHERE g.status = 'RESERVED'
  AND g.reserved_expires_at IS NULL;
