CREATE OR REPLACE FUNCTION public.handle_expired_gifts()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count int := 0;
  gift_record RECORD;
  item RECORD;
BEGIN
  FOR gift_record IN
    SELECT id, items_list
    FROM gift_experiences
    WHERE status = 'approved'
      AND is_redeemed = false
      AND approved_at IS NOT NULL
      AND approved_at < NOW() - INTERVAL '72 hours'
    FOR UPDATE
  LOOP
    UPDATE gift_experiences
    SET status = 'expired'
    WHERE id = gift_record.id;

    FOR item IN
      SELECT * FROM jsonb_to_recordset(gift_record.items_list) AS x(product_id uuid, nombre text, precio numeric, imagen_url text)
    LOOP
      UPDATE productos
      SET stock = stock + 1
      WHERE id = item.product_id;
    END LOOP;

    expired_count := expired_count + 1;
  END LOOP;

  RETURN expired_count;
END;
$$;
