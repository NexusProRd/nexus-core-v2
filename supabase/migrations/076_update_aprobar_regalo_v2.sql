-- ============================================================
-- 076: Update aprobar_regalo_v2 — setear reserved_expires_at
--
-- Sprint 3G: Al aprobar un regalo V2 (pending→RESERVED), se calcula
-- reserved_expires_at = NOW() + gift_config.reserved_expires_days
--
-- V1 no usa reserved_expires_at (no expira automáticamente).
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
  v_store_id UUID;
  v_is_v2 BOOLEAN;
  v_item JSONB;
  v_product_id UUID;
  v_stock INTEGER;
  v_reserved INTEGER;
  v_error_name TEXT;
  v_expires_days INT;
BEGIN
  -- 1. Lock gift row + validate status = pending
  SELECT status, items_list, sender_phone, store_id
  INTO v_status, v_items, v_sender_phone, v_store_id
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

  -- 4. Update gift status + set reserved_expires_at for V2
  IF v_is_v2 THEN
    v_expires_days := 7;
    BEGIN
      SELECT COALESCE((t.gift_config->>'reserved_expires_days')::INT, 7)
      INTO v_expires_days
      FROM public.tiendas t
      WHERE t.id = v_store_id;
    EXCEPTION WHEN OTHERS THEN
      v_expires_days := 7;
    END;

    UPDATE public.gift_experiences
    SET status = 'RESERVED',
        reserved_expires_at = NOW() + (v_expires_days || ' days')::INTERVAL
    WHERE id = p_gift_id;
  ELSE
    UPDATE public.gift_experiences
    SET status = 'approved', approved_at = NOW()
    WHERE id = p_gift_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
