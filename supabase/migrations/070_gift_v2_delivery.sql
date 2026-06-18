-- ============================================================
-- 070: Regalos V2 — Delivery columns + DELIVERED state
--
-- Sprint 2: Ubicación, entrega física, DELIVERED
-- ============================================================

-- ============================================================
-- 1. Add delivery columns to gift_experiences
-- ============================================================
ALTER TABLE public.gift_experiences
  ADD COLUMN delivery_address TEXT,
  ADD COLUMN delivery_location_link TEXT,
  ADD COLUMN shipping_cost NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN delivered_at TIMESTAMPTZ,
  ADD COLUMN location_requested_at TIMESTAMPTZ;

-- ============================================================
-- 2. Update CHECK constraint to include DELIVERED
-- ============================================================
ALTER TABLE public.gift_experiences
  DROP CONSTRAINT IF EXISTS gift_experiences_status_check,
  ADD CONSTRAINT gift_experiences_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled', 'RESERVED', 'CLAIMED', 'DELIVERED'));

-- ============================================================
-- 3. RPC: entregar_regalo_v2 (CLAIMED + delivery → DELIVERED)
--
-- Atomic: FOR UPDATE + stock deduction in single transaction.
-- For each item: stock -= 1, stock_reservado -= 1.
-- Raises EXCEPTION if stock or stock_reservado insufficient.
-- Does NOT touch ventas or ganancias (computed in reports).
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

  IF v_delivery_address IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Debes registrar una dirección de entrega antes de marcar como entregado.');
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

-- ============================================================
-- 4. RPC: revertir_entrega_regalo_v2 (DELIVERED → CLAIMED)
--
-- Reverses a mistaken delivery. Restores stock and stock_reservado.
-- Atomic: FOR UPDATE + stock restore in single transaction.
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

  -- Restore stock for each item (quantity = 1 per item)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;

    UPDATE public.productos
    SET stock = stock + 1,
        stock_reservado = stock_reservado + 1
    WHERE id = v_product_id;
  END LOOP;

  UPDATE public.gift_experiences
  SET status = 'CLAIMED', delivered_at = NULL
  WHERE id = p_gift_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
