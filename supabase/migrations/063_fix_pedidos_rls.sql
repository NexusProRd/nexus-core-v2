-- ============================================================
-- 063: Fix pedidos RLS — remove permissive anon SELECT + create
--       SECURITY DEFINER RPCs for controlled order access
--
-- Fixes P0 risks from Sprint Legal 1A audit:
--   R1: select_pedidos_anon USING(true) — any anon reads all pedidos
--   R2: TrackOrderModal searches by phone prefix without id_tienda
--   R4: delete_pedidos USING(true) — any auth user deletes any pedido
-- ============================================================

-- 1. Drop permissive anon SELECT policy (P0 risk R1)
DROP POLICY IF EXISTS "select_pedidos_anon" ON public.pedidos;

-- 2. Drop permissive authenticated DELETE policy (no store scoping)
DROP POLICY IF EXISTS "delete_pedidos" ON public.pedidos;

-- 3. Recreate DELETE policy scoped to own store
CREATE POLICY "delete_pedidos_own_store" ON public.pedidos
  FOR DELETE TO authenticated
  USING (
    id_tienda IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  );

-- 4. RPC: controlled order tracking (SECURITY DEFINER bypasses RLS)
--     Requires id_tienda + order_id — no phone search, no cross-store
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

-- 5. RPC: get pedido UUID by order_id (for quick buy flows after INSERT)
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
