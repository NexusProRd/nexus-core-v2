-- ============================================================
-- 073: Hardening — Aprobar y Cancelar regalos V2 atómicamente
--
-- Sprint 3G-Prep: Soluciona H3 (Double-Approve) y H4 (Cancel-Conversion Race)
--
-- aprobar_regalo_v2:  Reemplaza updateStatus multi-paso en GiftDashboard.
--                      FOR UPDATE + status validation en una transacción.
--                      Maneja V2 (RESERVED + stock_reservado) y V1 (approved + stock).
--
-- cancelar_regalo_v2: Reemplaza cancelGift multi-paso en GiftDashboard.
--                      FOR UPDATE + validation converted_to_giftcard_at.
--                      Unreserve + status update atómico.
-- ============================================================

-- ============================================================
-- 1. RPC: aprobar_regalo_v2
-- ============================================================
CREATE OR REPLACE FUNCTION public.aprobar_regalo_v2(p_gift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_items JSONB;
  v_sender_phone TEXT;
  v_is_v2 BOOLEAN;
  v_item JSONB;
  v_product_id UUID;
  v_stock INTEGER;
  v_reserved INTEGER;
  v_error_name TEXT;
BEGIN
  -- 1. Lock gift row + validate status = pending
  SELECT status, items_list, sender_phone
  INTO v_status, v_items, v_sender_phone
  FROM public.gift_experiences
  WHERE id = p_gift_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Regalo no encontrado.');
  END IF;

  IF v_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El regalo no está pendiente. Estado actual: ' || v_status);
  END IF;

  v_is_v2 := v_sender_phone IS NOT NULL AND v_sender_phone != '';

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'El regalo no tiene productos asociados.');
  END IF;

  -- 2. First pass: validate stock for ALL products before mutating any
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    IF v_product_id IS NULL THEN CONTINUE; END IF;

    SELECT stock, stock_reservado
    INTO v_stock, v_reserved
    FROM public.productos
    WHERE id = v_product_id
    FOR UPDATE;

    IF v_is_v2 THEN
      IF v_stock - COALESCE(v_reserved, 0) < 1 THEN
        v_error_name := v_item->>'nombre';
        RETURN jsonb_build_object('success', false, 'error',
          'Stock insuficiente para "' || COALESCE(v_error_name, v_product_id::TEXT) || '". Disponible: ' || GREATEST(v_stock - COALESCE(v_reserved, 0), 0));
      END IF;
    ELSE
      IF v_stock < 1 THEN
        v_error_name := v_item->>'nombre';
        RETURN jsonb_build_object('success', false, 'error',
          'Stock insuficiente para "' || COALESCE(v_error_name, v_product_id::TEXT) || '". Stock actual: ' || v_stock);
      END IF;
    END IF;
  END LOOP;

  -- 3. Second pass: execute mutations (all validation passed)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    IF v_product_id IS NULL THEN CONTINUE; END IF;

    IF v_is_v2 THEN
      UPDATE public.productos
      SET stock_reservado = COALESCE(stock_reservado, 0) + 1
      WHERE id = v_product_id;
    ELSE
      UPDATE public.productos
      SET stock = GREATEST(stock - 1, 0),
          in_stock = (stock - 1) > 0
      WHERE id = v_product_id;
    END IF;
  END LOOP;

  -- 4. Update gift status
  IF v_is_v2 THEN
    UPDATE public.gift_experiences
    SET status = 'RESERVED'
    WHERE id = p_gift_id;
  ELSE
    UPDATE public.gift_experiences
    SET status = 'approved', approved_at = NOW()
    WHERE id = p_gift_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 2. RPC: cancelar_regalo_v2
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancelar_regalo_v2(p_gift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_converted_at TIMESTAMPTZ;
  v_items JSONB;
  v_item JSONB;
  v_product_id UUID;
BEGIN
  -- 1. Lock gift row + validate
  SELECT status, converted_to_giftcard_at, items_list
  INTO v_status, v_converted_at, v_items
  FROM public.gift_experiences
  WHERE id = p_gift_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Regalo no encontrado.');
  END IF;

  IF v_converted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'El regalo ya fue convertido a Gift Card y no puede cancelarse.');
  END IF;

  IF v_status NOT IN ('RESERVED', 'CLAIMED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo se pueden cancelar regalos RESERVED o CLAIMED. Estado actual: ' || v_status);
  END IF;

  -- 2. Unreserve stock for each item
  IF v_items IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
      v_product_id := (v_item->>'product_id')::UUID;
      IF v_product_id IS NULL THEN CONTINUE; END IF;

      UPDATE public.productos
      SET stock_reservado = GREATEST(COALESCE(stock_reservado, 0) - COALESCE((v_item->>'cantidad')::INTEGER, 1), 0)
      WHERE id = v_product_id;
    END LOOP;
  END IF;

  -- 3. Update gift status
  UPDATE public.gift_experiences
  SET status = 'cancelled'
  WHERE id = p_gift_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
