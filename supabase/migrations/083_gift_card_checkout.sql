-- ============================================================
-- 083: Gift Card Checkout — canjear_giftcard_v2 + pedidos columns
--
-- Sprint GC-01: Habilitar el uso de Gift Cards existentes
-- en el checkout para comprar productos.
--
-- 1. giftcard_code y giftcard_used en pedidos (tracking)
-- 2. Agregar 'direct_purchase' a gift_card_transactions type
-- 3. RPC canjear_giftcard_v2() — redención atómica con FOR UPDATE
-- ============================================================

-- ============================================================
-- 1. giftcard_code + giftcard_used en pedidos
-- ============================================================
ALTER TABLE public.pedidos
  ADD COLUMN giftcard_code TEXT,
  ADD COLUMN giftcard_used NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN public.pedidos.giftcard_code IS
  'Código de la Gift Card aplicada (NULL si no se usó)';

COMMENT ON COLUMN public.pedidos.giftcard_used IS
  'Monto descontado de la Gift Card en este pedido';

-- ============================================================
-- 2. Agregar 'direct_purchase' a gift_card_transactions type
-- ============================================================
ALTER TABLE public.gift_card_transactions
  DROP CONSTRAINT IF EXISTS gift_card_transactions_type_check;

ALTER TABLE public.gift_card_transactions
  ADD CONSTRAINT gift_card_transactions_type_check
  CHECK (type IN ('creation', 'redemption', 'expiration', 'cancellation', 'direct_purchase'));

-- ============================================================
-- 3. RPC canjear_giftcard_v2()
--
-- Redime parcial o totalmente una Gift Card.
-- Misma arquitectura de seguridad que aprobar_regalo_v2,
-- cancelar_regalo_v2 y convertir_regalo_a_giftcard_v2.
--
-- FOR UPDATE: serializa accesos concurrentes.
-- La Gift Card permanece active mientras balance > 0.
-- Pasa a redeemed SOLO cuando balance = 0.
-- ============================================================
CREATE OR REPLACE FUNCTION public.canjear_giftcard_v2(
  p_code       TEXT,
  p_store_id   UUID,
  p_amount     NUMERIC(10,2),
  p_order_id   UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gift_id        UUID;
  v_gift_store_id  UUID;
  v_balance        NUMERIC(10,2);
  v_status         TEXT;
  v_expires_at     TIMESTAMPTZ;
  v_consumed       NUMERIC(10,2);
  v_new_balance    NUMERIC(10,2);
BEGIN
  -- 1. Lock & validate gift card
  SELECT id, store_id, balance, status, expires_at
  INTO v_gift_id, v_gift_store_id, v_balance, v_status, v_expires_at
  FROM public.gift_cards
  WHERE upper(code) = upper(p_code)
  FOR UPDATE;

  IF v_gift_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift Card no encontrada.');
  END IF;

  IF v_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Gift Card no está activa. Estado actual: ' || v_status);
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Gift Card expiró el ' || to_char(v_expires_at, 'DD/MM/YYYY'));
  END IF;

  IF v_balance <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Gift Card no tiene saldo disponible.');
  END IF;

  IF v_gift_store_id != p_store_id THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Gift Card no pertenece a esta tienda.');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error',
      'El monto a canjear debe ser mayor a 0.');
  END IF;

  -- 2. Calculate consumed amount & new balance
  v_consumed := LEAST(p_amount, v_balance);
  v_new_balance := v_balance - v_consumed;

  -- 3. Update gift card
  UPDATE public.gift_cards
  SET balance = v_new_balance,
      status = CASE WHEN v_new_balance <= 0 THEN 'redeemed' ELSE status END,
      redeemed_at = CASE WHEN v_new_balance <= 0 THEN NOW() ELSE redeemed_at END
  WHERE id = v_gift_id;

  -- 4. Create transaction record
  INSERT INTO public.gift_card_transactions (gift_card_id, order_id, amount, type)
  VALUES (v_gift_id, p_order_id, v_consumed, 'redemption');

  -- 5. Return result
  RETURN jsonb_build_object(
    'success', true,
    'gift_card_id', v_gift_id,
    'consumed', v_consumed,
    'remaining_balance', v_new_balance,
    'gift_card_status', CASE WHEN v_new_balance <= 0 THEN 'redeemed' ELSE 'active' END
  );
END;
$$;

COMMENT ON FUNCTION public.canjear_giftcard_v2 IS
  'Redime una Gift Card en un pedido. FOR UPDATE lock. La Gift Card permanece
   active mientras balance > 0. Pasa a redeemed solo cuando balance = 0.
   Uso: SELECT canjear_giftcard_v2(''GCXXXX'', store_id, amount, order_id);';
