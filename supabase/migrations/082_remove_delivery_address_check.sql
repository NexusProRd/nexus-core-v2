-- ============================================================
-- 082: Remove delivery_address requirement from entregar_regalo_v2
--
-- Regalos V3.5: delivery is coordinated via WhatsApp.
-- delivery_address is no longer required to mark as delivered.
-- The RPC still accepts the column (may be set post-hoc in dashboard),
-- but no longer blocks the DELIVERED transition if it's NULL.
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

  -- Deduct stock for each item (quantity = 1 per item, no cantidad field in items_list)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_stock := 0;
    v_reserved := 0;

    SELECT stock, stock_reservado
    INTO v_stock, v_reserved
    FROM public.productos
    WHERE id = v_product_id
    FOR UPDATE;

    IF v_stock < 1 THEN
      RAISE EXCEPTION 'Stock insuficiente para el producto %: disponible %, requerido 1', v_product_id, v_stock;
    END IF;

    IF v_reserved < 1 THEN
      RAISE EXCEPTION 'stock_reservado insuficiente para el producto %: reservado %, requerido 1', v_product_id, v_reserved;
    END IF;

    UPDATE public.productos
    SET stock = stock - 1,
        stock_reservado = GREATEST(stock_reservado - 1, 0)
    WHERE id = v_product_id;
  END LOOP;

  UPDATE public.gift_experiences
  SET status = 'DELIVERED', delivered_at = NOW()
  WHERE id = p_gift_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
