-- ============================================================
-- 084: Restaurar Gift Card — Rollback para checkout atómico
-- Sprint PRE-LAUNCH-01A: Atomicidad de checkout
--
-- RPC para restaurar una Gift Card después de un checkout
-- que falló a mitad del flujo (P0-1).
--
-- Idempotente: si la última transacción ya fue cancelada,
-- retorna already_restored sin modificar datos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.restaurar_giftcard_v2(
  p_gift_card_id UUID,
  p_amount       NUMERIC(10,2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn_id       UUID;
  v_balance      NUMERIC(10,2);
  v_status       TEXT;
  v_new_balance  NUMERIC(10,2);
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'El monto a restaurar debe ser mayor a 0.');
  END IF;

  -- 1. Lock & validate gift card
  SELECT balance, status
  INTO v_balance, v_status
  FROM public.gift_cards
  WHERE id = p_gift_card_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift Card no encontrada.');
  END IF;

  -- 2. Find the latest non-cancelled redemption transaction
  SELECT id INTO v_txn_id
  FROM public.gift_card_transactions
  WHERE gift_card_id = p_gift_card_id
    AND type = 'redemption'
  ORDER BY created_at DESC
  LIMIT 1;

  -- 3. If no redemption found → already restored
  IF v_txn_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'already_restored');
  END IF;

  -- 4. Cancel the transaction
  UPDATE public.gift_card_transactions
  SET type = 'cancellation'
  WHERE id = v_txn_id;

  -- 5. Restore balance & status
  v_new_balance := v_balance + p_amount;

  UPDATE public.gift_cards
  SET balance = v_new_balance,
      status = 'active',
      redeemed_at = NULL
  WHERE id = p_gift_card_id;

  RETURN jsonb_build_object(
    'success', true,
    'restored_amount', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;

COMMENT ON FUNCTION public.restaurar_giftcard_v2 IS
  'Restaura una Gift Card tras un checkout fallido. Reversa la última transacción
   de redención y restaura balance+status. Idempotente: si ya fue restaurada
   (no hay redemption activa), retorna already_restored.';
