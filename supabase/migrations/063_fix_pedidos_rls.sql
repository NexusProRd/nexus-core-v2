-- ============================================================
-- 063: RLS Hardening — remove permissive policies on pedidos,
--       detalles_pedido, and gift_experiences
--
-- Sprint Legal 1A: Fixes P0 risks from audit:
--   R1: select_pedidos_anon USING(true) — any anon reads all pedidos
--   R2: TrackOrderModal searches by phone prefix without id_tienda
--   R3: delete_pedidos USING(true) — any auth user deletes any pedido (from 019)
--   R4: delete_detalles_pedido USING(true) — any auth user deletes any detalle (from 019)
--   R5: delete_gift_experiences USING(true) — any auth user deletes any gift (from 019)
--
-- Migration strategy:
--   1. Dashboard server actions now use createAdminClient() (bypass RLS)
--   2. Anon catalog access uses RPCs (SECURITY DEFINER) or controlled INSERT
--   3. Remaining authenticated policies are defense-in-depth only
-- ============================================================

-- ============================================================
-- PART 1: pedidos table
-- ============================================================

-- 1a. Drop permissive anon SELECT policy (P0 risk R1)
DROP POLICY IF EXISTS "select_pedidos_anon" ON public.pedidos;

-- 1b. Drop permissive authenticated DELETE policy from 019 (R3)
DROP POLICY IF EXISTS "delete_pedidos" ON public.pedidos;

-- 1c. Create scoped DELETE policy (defense-in-depth)
CREATE POLICY "delete_pedidos_own_store" ON public.pedidos
  FOR DELETE TO authenticated
  USING (
    id_tienda IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  );

-- ============================================================
-- PART 2: detalles_pedido table
-- ============================================================

-- 2a. Drop permissive authenticated DELETE policy from 019 (R4)
DROP POLICY IF EXISTS "delete_detalles_pedido" ON public.detalles_pedido;

-- 2b. Create scoped DELETE policy (defense-in-depth)
CREATE POLICY "delete_detalles_own_store" ON public.detalles_pedido
  FOR DELETE TO authenticated
  USING (
    id_pedido IN (
      SELECT id FROM public.pedidos
      WHERE id_tienda IN (
        SELECT id FROM public.tiendas WHERE id_owner = auth.uid()
      )
    )
  );

-- ============================================================
-- PART 3: gift_experiences table
-- ============================================================

-- 3a. Drop permissive authenticated DELETE policy from 019 (R5)
DROP POLICY IF EXISTS "delete_gift_experiences" ON public.gift_experiences;

-- 3b. Create scoped DELETE policy (defense-in-depth)
CREATE POLICY "delete_gift_experiences_own_store" ON public.gift_experiences
  FOR DELETE TO authenticated
  USING (
    store_id IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  );

-- ============================================================
-- PART 4: SECURITY DEFINER RPCs for controlled anon access
-- ============================================================

-- 4a. Controlled order tracking (replaces anon SELECT on pedidos)
CREATE OR REPLACE FUNCTION public.track_pedido(
  p_id_tienda UUID,
  p_query TEXT
)
RETURNS TABLE(
  id UUID,
  order_id TEXT,
  estado TEXT,
  total NUMERIC,
  creado_at TIMESTAMPTZ,
  cliente_nombre TEXT,
  detalles_pedido JSONB,
  nombre_tienda TEXT,
  direccion TEXT,
  rnc TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.order_id,
    p.estado,
    p.total,
    p.creado_at,
    p.cliente_nombre,
    p.detalles_pedido,
    t.nombre_tienda,
    t.direccion,
    t.rnc
  FROM public.pedidos p
  LEFT JOIN public.tiendas t ON t.id = p.id_tienda
  WHERE p.id_tienda = p_id_tienda
    AND (p.order_id = p_query OR p.id::text = p_query)
  LIMIT 1;
END;
$$;

-- 4b. Get pedido UUID by order_id (for quick buy flows after INSERT)
CREATE OR REPLACE FUNCTION public.obtener_id_pedido_por_order(
  p_id_tienda UUID,
  p_order_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id
  FROM public.pedidos
  WHERE id_tienda = p_id_tienda AND order_id = p_order_id
  LIMIT 1;
  RETURN v_id;
END;
$$;
