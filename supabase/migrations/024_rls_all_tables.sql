-- ============================================================
-- 024: Add missing RLS policies for all app tables
-- Tables: productos, perfil_tienda
-- ============================================================

-- ============================================================
-- 1. PRODUCTOS
-- ============================================================
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_productos" ON public.productos;
CREATE POLICY "select_productos" ON public.productos
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_productos" ON public.productos;
CREATE POLICY "insert_productos" ON public.productos
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_productos" ON public.productos;
CREATE POLICY "update_productos" ON public.productos
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. PERFIL_TIENDA (already handled by API route with service_role,
--    but add policies as fallback for future)
-- ============================================================
ALTER TABLE public.perfil_tienda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_perfil_tienda" ON public.perfil_tienda;
CREATE POLICY "select_perfil_tienda" ON public.perfil_tienda
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_perfil_tienda" ON public.perfil_tienda;
CREATE POLICY "insert_perfil_tienda" ON public.perfil_tienda
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_perfil_tienda" ON public.perfil_tienda;
CREATE POLICY "update_perfil_tienda" ON public.perfil_tienda
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);
