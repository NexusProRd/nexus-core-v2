-- ============================================================
-- 077: Fix convertir_regalo_a_giftcard_v2 — unreserve + status=expired
--
-- Sprint 3G: Corrige stock leak detectado en QA.
--
-- Antes: La RPC creaba la Gift Card pero NO liberaba stock_reservado
--        y NO cambiaba el status. El regalo quedaba como RESERVADO/CLAIMED
--        con stock permanentemente ocupado.
--
-- Después: Al convertir:
--   1. Libera stock_reservado (si status IN ('RESERVED','CLAIMED'))
--   2. Cambia status → 'expired'
--   3. Setea converted_to_giftcard_at
--   4. Crea gift_card + transaction
--   Todo atómico.
--
-- Compatibilidad: La UI de GiftDashboard checkea converted_to_giftcard_at
-- para mostrar "Procesado", no status. Sin regresión en Sprint 3E.
-- ============================================================

CREATE OR REPLACE FUNCTION public.convertir_regalo_a_giftcard_v2(p_gift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id         UUID;
  v_receiver_name    TEXT;
  v_receiver_phone   TEXT;
  v_items            JSONB;
  v_status           TEXT;
  v_converted_at     TIMESTAMPTZ;
  v_total            NUMERIC(10,2);
  v_item             JSONB;
  v_precio           NUMERIC(10,2);
  v_product_id       UUID;
  v_code             TEXT;
  v_chars            CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_gift_config      JSONB;
  v_expires_days     INT;
  v_expires_at       TIMESTAMPTZ;
  v_gift_card_id     UUID;
BEGIN
  -- 1. Lock & validate gift
  SELECT store_id, receiver_name, receiver_phone, items_list, status, converted_to_giftcard_at
  INTO v_store_id, v_receiver_name, v_receiver_phone, v_items, v_status, v_converted_at
  FROM public.gift_experiences
  WHERE id = p_gift_id
  FOR UPDATE;

  IF v_store_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Regalo no encontrado.');
  END IF;

  IF v_converted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'El regalo ya fue convertido a Gift Card.');
  END IF;

  IF v_status NOT IN ('RESERVED', 'CLAIMED', 'expired') THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Estado "' || v_status || '" no permitido para conversión. Estados válidos: RESERVED, CLAIMED, expired.');
  END IF;

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'El regalo no tiene productos asociados.');
  END IF;

  -- 2. If RESERVED or CLAIMED: unreserve stock + mark as expired
  IF v_status IN ('RESERVED', 'CLAIMED') THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
      v_product_id := (v_item->>'product_id')::UUID;
      IF v_product_id IS NULL THEN CONTINUE; END IF;

      UPDATE public.productos
      SET stock_reservado = GREATEST(COALESCE(stock_reservado, 0) - 1, 0)
      WHERE id = v_product_id;
    END LOOP;

    UPDATE public.gift_experiences
    SET status = 'expired'
    WHERE id = p_gift_id;
  END IF;

  -- 3. Calculate total value from items_list
  v_total := 0;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    BEGIN
      v_precio := (v_item->>'precio')::NUMERIC;
      IF v_precio IS NOT NULL AND v_precio > 0 THEN
        v_total := v_total + v_precio;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  IF v_total <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'El valor calculado del regalo debe ser mayor a 0.');
  END IF;

  -- 4. Generate gift card code (GC + 10 random alphanumeric chars)
  v_code := 'GC';
  FOR i IN 1..10 LOOP
    v_code := v_code || substr(v_chars, 1 + floor(random() * 36)::int, 1);
  END LOOP;

  -- 5. Calculate expiration from store's gift_config (default 365 days)
  SELECT gift_config INTO v_gift_config FROM public.tiendas WHERE id = v_store_id;

  v_expires_days := 365;
  IF v_gift_config IS NOT NULL AND jsonb_typeof(v_gift_config) = 'object' THEN
    BEGIN
      v_expires_days := COALESCE((v_gift_config->>'gift_card_expires_days')::INT, 365);
    EXCEPTION WHEN OTHERS THEN
      v_expires_days := 365;
    END;
  END IF;

  v_expires_at := NOW() + (v_expires_days || ' days')::INTERVAL;

  -- 6. Create gift card
  INSERT INTO public.gift_cards (store_id, original_gift_id, code, initial_value, balance, recipient_name, recipient_phone, status, expires_at)
  VALUES (v_store_id, p_gift_id, v_code, v_total, v_total, v_receiver_name, v_receiver_phone, 'active', v_expires_at)
  RETURNING id INTO v_gift_card_id;

  -- 7. Create transaction record
  INSERT INTO public.gift_card_transactions (gift_card_id, order_id, amount, type)
  VALUES (v_gift_card_id, NULL, v_total, 'creation');

  -- 8. Mark gift as converted
  UPDATE public.gift_experiences
  SET converted_to_giftcard_at = NOW()
  WHERE id = p_gift_id;

  -- 9. Return result
  RETURN jsonb_build_object(
    'success', true,
    'giftCard', jsonb_build_object('id', v_gift_card_id, 'code', v_code),
    'value', v_total,
    'expiresAt', v_expires_at
  );
END;
$$;
