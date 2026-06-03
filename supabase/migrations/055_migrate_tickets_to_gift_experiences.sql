-- ============================================================
-- 055: Migrate tickets table to gift_experiences (legacy_code)
--
-- Adds legacy_code column to gift_experiences for tracking
-- the original ticket code during migration.
-- Backfills all existing tickets into gift_experiences.
-- ============================================================

-- 1. Add legacy_code column (stores original ticket code for traceability)
ALTER TABLE public.gift_experiences ADD COLUMN IF NOT EXISTS legacy_code TEXT;
CREATE INDEX IF NOT EXISTS idx_gift_experiences_legacy_code ON public.gift_experiences (legacy_code);

-- 2. Backfill: migrate each ticket to a gift_experiences row
DO $$
DECLARE
  t RECORD;
  v_items JSONB;
  v_phone TEXT;
  v_status TEXT;
  v_count INT := 0;
BEGIN
  FOR t IN
    SELECT tk.*, p.cliente_telefono, p.cliente_nombre
    FROM public.tickets tk
    LEFT JOIN public.pedidos p ON p.id = tk.order_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.gift_experiences ge WHERE ge.legacy_code = tk.code
    )
  LOOP
    -- Build items_list from order products
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'product_id', dp.id_producto,
          'nombre', COALESCE(pr.nombre, 'Producto'),
          'precio', 0,
          'imagen_url', pr.imagen_url,
          'id_pedido_origen', t.order_id
        )
      ),
      '[]'::jsonb
    ) INTO v_items
    FROM public.detalles_pedido dp
    LEFT JOIN public.productos pr ON pr.id = dp.id_producto
    WHERE dp.id_pedido = t.order_id;

    -- Determine status: tickets only had is_redeemed boolean + 72h expiry
    IF t.is_redeemed THEN
      v_status := 'approved';
    ELSIF t.created_at < NOW() - INTERVAL '72 hours' THEN
      v_status := 'expired';
    ELSE
      v_status := 'approved';
    END IF;

    -- Get phone from pedidos or gift_details
    v_phone := t.cliente_telefono;
    IF v_phone IS NULL THEN
      v_phone := t.gift_details->>'sender_phone';
    END IF;

    -- Insert into gift_experiences
    INSERT INTO public.gift_experiences (
      store_id,
      sender_name,
      receiver_name,
      personal_message,
      gift_code,
      is_redeemed,
      status,
      approved_at,
      created_at,
      items_list,
      sender_phone,
      legacy_code
    ) VALUES (
      t.store_id,
      COALESCE(t.gift_details->>'sender_name', ''),
      COALESCE(t.gift_details->>'recipient_name', ''),
      COALESCE(t.gift_details->>'dedication', ''),
      t.code,
      t.is_redeemed,
      v_status,
      t.created_at,
      t.created_at,
      v_items,
      v_phone,
      t.code
    )
    ON CONFLICT (gift_code) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % tickets to gift_experiences', v_count;
END;
$$;
