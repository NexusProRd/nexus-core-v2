CREATE OR REPLACE FUNCTION public.decrementar_uso_cupon(
  p_code     TEXT,
  p_store_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_new_count INTEGER;
BEGIN
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE code = p_code
    AND store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cupón no encontrado.');
  END IF;

  IF v_coupon.usage_count <= 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'already_at_zero', 'usage_count', 0);
  END IF;

  v_new_count := v_coupon.usage_count - 1;

  UPDATE public.coupons
  SET usage_count = v_new_count
  WHERE id = v_coupon.id;

  RETURN jsonb_build_object(
    'success', true,
    'usage_count', v_new_count,
    'usage_limit', v_coupon.usage_limit
  );
END;
$$;
