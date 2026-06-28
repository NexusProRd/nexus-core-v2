-- ============================================================
-- 088: Variant-aware stock management in Gift RPCs
--
-- BUG 2: Gift Purchase con variantes
-- Actualiza los RPCs de regalos para manejar correctamente
-- productos con variantes (tallas, colores, etc.) en el
-- ciclo de vida del regalo: aprobar, entregar, revertir.
--
-- Cambios:
--   aprobar_regalo_v2:     Valida stock contra la variante específica
--   entregar_regalo_v2:    Descuenta stock de la variante en tallas[]
--   revertir_entrega_regalo_v2: Restaura stock de la variante en tallas[]
--   cancelar_regalo_v2:    Sin cambios (stock_reservado es global)
-- ============================================================

-- ============================================================
-- 1. RPC: aprobar_regalo_v2 — Variant-aware stock validation
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
  v_variante TEXT;
  v_tallas JSONB;
  v_variant_stock INTEGER;
  v_store_id UUID;
  v_expires_days INT;
  v_error_name TEXT;
BEGIN
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

  -- First pass: validate stock for ALL products before mutating any
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    IF v_product_id IS NULL THEN CONTINUE; END IF;

    SELECT stock, stock_reservado, tallas
    INTO v_stock, v_reserved, v_tallas
    FROM public.productos
    WHERE id = v_product_id
    FOR UPDATE;

    v_variante := v_item->>'variante_seleccionada';

    IF v_is_v2 THEN
      IF v_variante IS NOT NULL AND v_variante != '' AND v_tallas IS NOT NULL AND jsonb_typeof(v_tallas) = 'array' THEN
        -- Variant-specific stock check
        SELECT (elem->>'stock')::INTEGER
        INTO v_variant_stock
        FROM jsonb_array_elements(v_tallas) AS elem
        WHERE jsonb_typeof(elem) = 'object' AND elem->>'talla' = v_variante;

        IF v_variant_stock IS NULL THEN
          v_error_name := v_item->>'nombre';
          RETURN jsonb_build_object('success', false, 'error',
            'Variante "' || v_variante || '" no encontrada para "' || COALESCE(v_error_name, v_product_id::TEXT) || '".');
        END IF;

        IF v_variant_stock - COALESCE(v_reserved, 0) < COALESCE((v_item->>'cantidad')::INTEGER, 1) THEN
          v_error_name := v_item->>'nombre';
          RETURN jsonb_build_object('success', false, 'error',
            'Stock insuficiente para la variante "' || v_variante || '" de "' || COALESCE(v_error_name, v_product_id::TEXT) || '". Disponible: ' || GREATEST(v_variant_stock - COALESCE(v_reserved, 0), 0));
        END IF;
      ELSE
        -- No variant: use product-level stock
        IF v_stock - COALESCE(v_reserved, 0) < COALESCE((v_item->>'cantidad')::INTEGER, 1) THEN
          v_error_name := v_item->>'nombre';
          RETURN jsonb_build_object('success', false, 'error',
            'Stock insuficiente para "' || COALESCE(v_error_name, v_product_id::TEXT) || '". Disponible: ' || GREATEST(v_stock - COALESCE(v_reserved, 0), 0));
        END IF;
      END IF;
    ELSE
      -- V1 flow: direct stock check
      IF v_stock < COALESCE((v_item->>'cantidad')::INTEGER, 1) THEN
        v_error_name := v_item->>'nombre';
        RETURN jsonb_build_object('success', false, 'error',
          'Stock insuficiente para "' || COALESCE(v_error_name, v_product_id::TEXT) || '". Stock actual: ' || v_stock);
      END IF;
    END IF;
  END LOOP;

  -- Second pass: execute mutations (all validation passed)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    IF v_product_id IS NULL THEN CONTINUE; END IF;

    IF v_is_v2 THEN
      UPDATE public.productos
      SET stock_reservado = COALESCE(stock_reservado, 0) + COALESCE((v_item->>'cantidad')::INTEGER, 1)
      WHERE id = v_product_id;
    ELSE
      UPDATE public.productos
      SET stock = GREATEST(stock - 1, 0),
          in_stock = (stock - 1) > 0
      WHERE id = v_product_id;
    END IF;
  END LOOP;

  -- Update gift status + set reserved_expires_at for V2
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

-- ============================================================
-- 2. RPC: entregar_regalo_v2 — Variant-aware stock deduction
-- ============================================================
CREATE OR REPLACE FUNCTION public.entregar_regalo_v2(p_gift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_delivery_address TEXT;
  v_items JSONB;
  v_item JSONB;
  v_product_id UUID;
  v_stock INTEGER;
  v_reserved INTEGER;
  v_variante TEXT;
  v_tallas JSONB;
  v_tallas_actualizadas JSONB;
  v_stock_sum INTEGER;
  v_cantidad INTEGER;
  v_elem JSONB;
BEGIN
  SELECT status, delivery_address, items_list
  INTO v_status, v_delivery_address, v_items
  FROM public.gift_experiences
  WHERE id = p_gift_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Regalo no encontrado.');
  END IF;

  IF v_status = 'DELIVERED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este regalo ya fue entregado.');
  END IF;

  IF v_status != 'CLAIMED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El regalo debe estar reclamado para marcarlo como entregado.');
  END IF;

  -- Deduct stock for each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_stock := 0;
    v_reserved := 0;
    v_variante := v_item->>'variante_seleccionada';
    v_cantidad := COALESCE((v_item->>'cantidad')::INTEGER, 1);

    SELECT stock, stock_reservado, tallas
    INTO v_stock, v_reserved, v_tallas
    FROM public.productos
    WHERE id = v_product_id
    FOR UPDATE;

    IF v_variante IS NOT NULL AND v_variante != '' AND v_tallas IS NOT NULL AND jsonb_typeof(v_tallas) = 'array' THEN
      -- Check if variant exists as an object in tallas (has per-variant stock tracking)
      PERFORM 1 FROM jsonb_array_elements(v_tallas) AS elem
      WHERE jsonb_typeof(elem) = 'object' AND elem->>'talla' = v_variante;

      IF FOUND THEN
        -- Variant-specific stock deduction (object-form tallas)
        v_tallas_actualizadas := '[]'::JSONB;
        FOR v_elem IN SELECT * FROM jsonb_array_elements(v_tallas)
        LOOP
          IF jsonb_typeof(v_elem) = 'object' AND v_elem->>'talla' = v_variante THEN
            IF (v_elem->>'stock')::INTEGER < v_cantidad THEN
              RAISE EXCEPTION 'Stock insuficiente para la variante "%" del producto "%": disponible %, requerido %',
                v_variante, v_product_id, (v_elem->>'stock')::INTEGER, v_cantidad;
            END IF;
            v_tallas_actualizadas := v_tallas_actualizadas || jsonb_build_object(
              'talla', v_variante,
              'stock', GREATEST((v_elem->>'stock')::INTEGER - v_cantidad, 0),
              'precio', v_elem->>'precio',
              'costo', v_elem->>'costo',
              'sku', v_elem->>'sku'
            );
          ELSE
            v_tallas_actualizadas := v_tallas_actualizadas || v_elem;
          END IF;
        END LOOP;

        -- Recalculate total stock from updated tallas
        SELECT COALESCE(SUM((elem->>'stock')::INTEGER), 0)
        INTO v_stock_sum
        FROM jsonb_array_elements(v_tallas_actualizadas) AS elem
        WHERE jsonb_typeof(elem) = 'object';

        IF v_reserved < v_cantidad THEN
          RAISE EXCEPTION 'stock_reservado insuficiente para el producto "%": reservado %, requerido %',
            v_product_id, v_reserved, v_cantidad;
        END IF;

        UPDATE public.productos
        SET tallas = v_tallas_actualizadas,
            stock = v_stock_sum,
            stock_reservado = GREATEST(stock_reservado - v_cantidad, 0),
            in_stock = v_stock_sum > 0
        WHERE id = v_product_id;
      ELSE
        -- Variant specified but tallas are legacy strings (no per-variant stock tracking)
        -- Fall through to standard product-level stock deduction
        IF v_stock < v_cantidad THEN
          RAISE EXCEPTION 'Stock insuficiente para el producto "%": disponible %, requerido %', v_product_id, v_stock, v_cantidad;
        END IF;
        IF v_reserved < v_cantidad THEN
          RAISE EXCEPTION 'stock_reservado insuficiente para el producto "%": reservado %, requerido %', v_product_id, v_reserved, v_cantidad;
        END IF;
        UPDATE public.productos
        SET stock = stock - v_cantidad,
            stock_reservado = GREATEST(stock_reservado - v_cantidad, 0),
            in_stock = (stock - v_cantidad) > 0
        WHERE id = v_product_id;
      END IF;
    ELSE
      -- No variant: standard stock deduction
      IF v_stock < v_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto "%": disponible %, requerido %', v_product_id, v_stock, v_cantidad;
      END IF;

      IF v_reserved < v_cantidad THEN
        RAISE EXCEPTION 'stock_reservado insuficiente para el producto "%": reservado %, requerido %', v_product_id, v_reserved, v_cantidad;
      END IF;

      UPDATE public.productos
      SET stock = stock - v_cantidad,
          stock_reservado = GREATEST(stock_reservado - v_cantidad, 0),
          in_stock = (stock - v_cantidad) > 0
      WHERE id = v_product_id;
    END IF;
  END LOOP;

  UPDATE public.gift_experiences
  SET status = 'DELIVERED', delivered_at = NOW()
  WHERE id = p_gift_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 3. RPC: revertir_entrega_regalo_v2 — Variant-aware stock restore
-- ============================================================
CREATE OR REPLACE FUNCTION public.revertir_entrega_regalo_v2(p_gift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_items JSONB;
  v_item JSONB;
  v_product_id UUID;
  v_variante TEXT;
  v_tallas JSONB;
  v_tallas_actualizadas JSONB;
  v_stock_sum INTEGER;
  v_cantidad INTEGER;
  v_elem JSONB;
BEGIN
  SELECT status, items_list
  INTO v_status, v_items
  FROM public.gift_experiences
  WHERE id = p_gift_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Regalo no encontrado.');
  END IF;

  IF v_status != 'DELIVERED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo se pueden revertir regalos entregados.');
  END IF;

  -- Restore stock for each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_variante := v_item->>'variante_seleccionada';
    v_cantidad := COALESCE((v_item->>'cantidad')::INTEGER, 1);

    SELECT tallas INTO v_tallas
    FROM public.productos
    WHERE id = v_product_id
    FOR UPDATE;

    IF v_variante IS NOT NULL AND v_variante != '' AND v_tallas IS NOT NULL AND jsonb_typeof(v_tallas) = 'array' THEN
      -- Check if variant exists as an object in tallas
      PERFORM 1 FROM jsonb_array_elements(v_tallas) AS elem
      WHERE jsonb_typeof(elem) = 'object' AND elem->>'talla' = v_variante;

      IF FOUND THEN
        -- Variant-specific stock restoration (object-form tallas)
        v_tallas_actualizadas := '[]'::JSONB;
        FOR v_elem IN SELECT * FROM jsonb_array_elements(v_tallas)
        LOOP
          IF jsonb_typeof(v_elem) = 'object' AND v_elem->>'talla' = v_variante THEN
            v_tallas_actualizadas := v_tallas_actualizadas || jsonb_build_object(
              'talla', v_variante,
              'stock', ((v_elem->>'stock')::INTEGER) + v_cantidad,
              'precio', v_elem->>'precio',
              'costo', v_elem->>'costo',
              'sku', v_elem->>'sku'
            );
          ELSE
            v_tallas_actualizadas := v_tallas_actualizadas || v_elem;
          END IF;
        END LOOP;

        -- Recalculate total stock from restored tallas
        SELECT COALESCE(SUM((elem->>'stock')::INTEGER), 0)
        INTO v_stock_sum
        FROM jsonb_array_elements(v_tallas_actualizadas) AS elem
        WHERE jsonb_typeof(elem) = 'object';

        UPDATE public.productos
        SET tallas = v_tallas_actualizadas,
            stock = v_stock_sum,
            stock_reservado = COALESCE(stock_reservado, 0) + v_cantidad,
            in_stock = v_stock_sum > 0
        WHERE id = v_product_id;
      ELSE
        -- Variant specified but tallas are legacy strings: standard stock restoration
        UPDATE public.productos
        SET stock = stock + v_cantidad,
            stock_reservado = COALESCE(stock_reservado, 0) + v_cantidad,
            in_stock = true
        WHERE id = v_product_id;
      END IF;
    ELSE
      -- No variant: standard stock restoration
      UPDATE public.productos
      SET stock = stock + v_cantidad,
          stock_reservado = COALESCE(stock_reservado, 0) + v_cantidad,
          in_stock = true
      WHERE id = v_product_id;
    END IF;
  END LOOP;

  UPDATE public.gift_experiences
  SET status = 'CLAIMED', delivered_at = NULL
  WHERE id = p_gift_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
