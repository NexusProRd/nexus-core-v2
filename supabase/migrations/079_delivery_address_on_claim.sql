-- ============================================================
-- 079: Capturar dirección de entrega durante el canje
--
-- Sprint 3M: Reemplaza "Solicitar ubicación" (flujo muerto)
-- por captura de dirección en el modal de canje.
--
-- Si el comprador no especificó delivery_address,
-- el recipiente la proporciona al reclamar.
-- ============================================================

-- ============================================================
-- 1. Actualizar RPC: reclamar_regalo_v2
--
-- Nuevo parámetro opcional: p_delivery_address TEXT DEFAULT NULL
-- Si delivery_address actual es NULL y se proporciona,
-- se guarda dentro de la misma transacción.
-- ============================================================
CREATE OR REPLACE FUNCTION public.reclamar_regalo_v2(
  p_gift_code TEXT,
  p_store_id UUID,
  p_delivery_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gift_id UUID;
  v_items JSONB;
  v_status TEXT;
  v_current_address TEXT;
BEGIN
  SELECT id, items_list, status, delivery_address
  INTO v_gift_id, v_items, v_status, v_current_address
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

  IF v_current_address IS NULL AND p_delivery_address IS NOT NULL THEN
    UPDATE public.gift_experiences
    SET status = 'CLAIMED', claimed_at = NOW(), delivery_address = trim(p_delivery_address)
    WHERE id = v_gift_id;
  ELSE
    UPDATE public.gift_experiences
    SET status = 'CLAIMED', claimed_at = NOW()
    WHERE id = v_gift_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'items', v_items);
END;
$$;
