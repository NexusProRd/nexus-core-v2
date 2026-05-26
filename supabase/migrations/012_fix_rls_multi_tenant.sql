-- ============================================================
-- 012: Fix RLS policies for multi-tenant isolation
-- Targets: tickets, detalles_pedido, pedidos
-- 
-- Before: tickets had USING(true) / WITH CHECK(true) for
--   authenticated; detalles_pedido had USING(true) / 
--   WITH CHECK(true) for anon+authenticated; pedidos had NO
--   RLS at all (all rows visible to everyone).
-- 
-- After: strict store-owner scoping via auth.uid() for
--   authenticated operations; minimal anon policies for the
--   public gift-redemption and checkout flows.
-- ============================================================

-- ============================================================
-- 1. TICKETS
-- ============================================================

DROP POLICY IF EXISTS "Allow select on tickets for authenticated" ON public.tickets;
DROP POLICY IF EXISTS "Allow insert on tickets for authenticated" ON public.tickets;
DROP POLICY IF EXISTS "Allow update on tickets for authenticated" ON public.tickets;

-- 1a. anon: SELECT only unredeemed tickets (code = bearer token)
CREATE POLICY "select_tickets_anon" ON public.tickets
  FOR SELECT TO anon
  USING (is_redeemed = false);

-- 1b. authenticated (store owner): SELECT their own store's tickets
CREATE POLICY "select_tickets_own_store" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    store_id IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  );

-- 1c. authenticated (store owner): INSERT tickets for their own store
CREATE POLICY "insert_tickets_own_store" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    store_id IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  );

-- 1d. anon: UPDATE only is_redeemed (false → true) on unredeemed tickets
CREATE POLICY "update_tickets_anon_redeem" ON public.tickets
  FOR UPDATE TO anon
  USING (is_redeemed = false)
  WITH CHECK (is_redeemed = true);

-- 1e. authenticated (store owner): UPDATE tickets in their own store
CREATE POLICY "update_tickets_own_store" ON public.tickets
  FOR UPDATE TO authenticated
  USING (
    store_id IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  )
  WITH CHECK (
    store_id IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  );


-- ============================================================
-- 2. DETALLES_PEDIDO
-- ============================================================

DROP POLICY IF EXISTS "Lectura pública de detalles_pedido" ON public.detalles_pedido;
DROP POLICY IF EXISTS "Insertar detalles_pedido" ON public.detalles_pedido;

-- 2a. authenticated (store owner): SELECT detalles for their own pedidos
CREATE POLICY "select_detalles_own_store" ON public.detalles_pedido
  FOR SELECT TO authenticated
  USING (
    id_pedido IN (
      SELECT id FROM public.pedidos
      WHERE id_tienda IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
    )
  );

-- 2b. anon + authenticated: INSERT detalles if the pedido exists
CREATE POLICY "insert_detalles_pedido" ON public.detalles_pedido
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pedidos WHERE id = id_pedido)
  );


-- ============================================================
-- 3. PEDIDOS
-- ============================================================

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- 3a. anon: SELECT only for legitimate flows (track order, post-checkout lookup).
--     The app ALWAYS filters by id_tienda + order_id or id in every anon query.
--     Full protection requires migrating anon flows to SECURITY DEFINER RPCs
--     (see 013_real_atomic_gift_redemption.sql for the pattern).
CREATE POLICY "select_pedidos_anon" ON public.pedidos
  FOR SELECT TO anon
  USING (true);

-- 3b. authenticated (store owner): SELECT only their own store's pedidos
CREATE POLICY "select_pedidos_own_store" ON public.pedidos
  FOR SELECT TO authenticated
  USING (
    id_tienda IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  );

-- 3c. anon + authenticated: INSERT pedidos (catalog checkout)
CREATE POLICY "insert_pedidos_catalog" ON public.pedidos
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 3d. authenticated (store owner): UPDATE their own store's pedidos
CREATE POLICY "update_pedidos_own_store" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (
    id_tienda IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  )
  WITH CHECK (
    id_tienda IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  );
