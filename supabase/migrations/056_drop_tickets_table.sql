-- ============================================================
-- 056: Drop tickets table (Subsystem B removed)
--
-- After migration 055 backfilled all tickets → gift_experiences,
-- the legacy tickets table and related RPC references are safe
-- to remove. is_gift column kept for transition period.
-- ============================================================

-- 1. Update eliminar_tienda_completa: remove tickets DELETE
CREATE OR REPLACE FUNCTION public.eliminar_tienda_completa(tienda_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM detalles_pedido WHERE id_pedido IN (SELECT id FROM pedidos WHERE id_tienda = tienda_id);
  DELETE FROM pedidos WHERE id_tienda = tienda_id;
  DELETE FROM productos WHERE id_tienda = tienda_id;
  DELETE FROM perfil_tienda WHERE id_tienda = tienda_id;
  DELETE FROM gift_experiences WHERE store_id = tienda_id;
  DELETE FROM coupons WHERE store_id = tienda_id;
  DELETE FROM nexus_logs WHERE id_tienda = tienda_id;
  DELETE FROM tiendas WHERE id = tienda_id;
END;
$$;

-- 2. Remove from Realtime publication before dropping
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.tickets;

-- 3. Drop tickets table
DROP TABLE IF EXISTS public.tickets CASCADE;

-- 4. is_gift column NOT dropped yet — kept for transition period.
-- Future sprint: ALTER TABLE public.pedidos DROP COLUMN IF EXISTS is_gift;
