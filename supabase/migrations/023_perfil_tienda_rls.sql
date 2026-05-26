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
