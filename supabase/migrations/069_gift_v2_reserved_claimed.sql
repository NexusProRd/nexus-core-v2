-- ============================================================
-- 069: Regalos V2 — RESERVED/CLAIMED states + stock_reservado
--
-- Sprint 1: Compra regalo → RESERVED → stock_reservado → enlace → CLAIMED
-- ============================================================

-- ============================================================
-- 1. Add stock_reservado to productos
-- ============================================================
ALTER TABLE public.productos
  ADD COLUMN stock_reservado INTEGER DEFAULT 0 NOT NULL;

-- ============================================================
-- 2. Add claimed_at to gift_experiences
-- ============================================================
ALTER TABLE public.gift_experiences
  ADD COLUMN claimed_at TIMESTAMPTZ;

-- ============================================================
-- 3. Update CHECK constraint to include V2 states
-- ============================================================
ALTER TABLE public.gift_experiences
  DROP CONSTRAINT IF EXISTS gift_experiences_status_check,
  ADD CONSTRAINT gift_experiences_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled', 'RESERVED', 'CLAIMED'));

-- ============================================================
-- 4. New RPC: reclamar_regalo_v2 (RESERVED → CLAIMED)
--
-- Atomic: uses FOR UPDATE to prevent race conditions.
-- Does NOT touch stock_reservado (stays reserved until delivery).
-- Does NOT validate expiration (not implemented in Sprint 1).
-- ============================================================
CREATE OR REPLACE FUNCTION public.reclamar_regalo_v2(p_gift_code TEXT, p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gift_id UUID;
  v_items JSONB;
  v_status TEXT;
BEGIN
  SELECT id, items_list, status
  INTO v_gift_id, v_items, v_status
  FROM public.gift_experiences
  WHERE gift_code = upper(trim(p_gift_code)) AND store_id = p_store_id
  FOR UPDATE;

  IF v_gift_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de regalo no encontrado.');
  END IF;

  IF v_status = 'CLAIMED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este regalo ya fue canjeado previamente.');
  END IF;

  IF v_status != 'RESERVED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este regalo no está disponible o no ha sido reservado.');
  END IF;

  UPDATE public.gift_experiences
  SET status = 'CLAIMED', claimed_at = NOW()
  WHERE id = v_gift_id;

  RETURN jsonb_build_object('success', true, 'items', v_items);
END;
$$;
