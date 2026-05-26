-- ============================================================
-- 013: Real atomic gift redemption RPC (SECURITY DEFINER)
-- 
-- Creates an atomic SECURITY DEFINER function that locks
-- the gift row (FOR UPDATE) to prevent race conditions
-- during concurrent redemption attempts.
-- ============================================================

-- ============================================================
-- 1. ATOMIC GIFT REDEMPTION RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.procesar_canje_regalo(p_gift_code TEXT, p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gift_id UUID;
  v_items JSONB;
  v_status TEXT;
  v_is_redeemed BOOLEAN;
  v_approved_at TIMESTAMPTZ;
BEGIN
  -- Bloquear la fila del regalo para prevenir accesos concurrentes
  SELECT id, items_list, status, is_redeemed, approved_at
  INTO v_gift_id, v_items, v_status, v_is_redeemed, v_approved_at
  FROM public.gift_experiences
  WHERE gift_code = upper(trim(p_gift_code)) AND store_id = p_store_id
  FOR UPDATE;

  IF v_gift_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de regalo no encontrado.');
  END IF;

  IF v_is_redeemed OR v_status = 'redeemed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este regalo ya fue canjeado previamente.');
  END IF;

  IF v_status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este regalo no está disponible o no ha sido aprobado.');
  END IF;

  IF v_approved_at IS NULL OR v_approved_at < NOW() - INTERVAL '72 hours' THEN
    UPDATE public.gift_experiences SET status = 'expired' WHERE id = v_gift_id;
    RETURN jsonb_build_object('success', false, 'error', 'Este ticket de regalo ha expirado por límite de 72 horas.');
  END IF;

  -- NO VALIDAR STOCK AQUÍ. El stock ya fue decrementado al momento de la aprobación del comercio.
  -- Proceder al canje seguro cambiando el estado de la fila bloqueada
  UPDATE public.gift_experiences
  SET is_redeemed = true
  WHERE id = v_gift_id;

  RETURN jsonb_build_object('success', true, 'items', v_items);
END;
$$;
