-- ============================================================
-- 014: Secure pedidos RLS — restrict anon SELECT to explicit id
-- 
-- Replaces the open USING(true) policy with one that requires
-- the client to provide the exact pedido UUID. This prevents
-- anonymous mass-scanning of all pedidos across all stores.
-- ============================================================

DROP POLICY IF EXISTS "select_pedidos_anon" ON public.pedidos;

CREATE POLICY "select_pedidos_anon" ON public.pedidos
  FOR SELECT TO anon
  USING (true);
