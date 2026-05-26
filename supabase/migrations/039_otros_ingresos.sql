-- ============================================================
-- 039: Tabla para registrar otros ingresos del PCC
-- ============================================================

-- 1. nexus_otros_ingresos — Ingresos externos (backups, etc.)
CREATE TABLE IF NOT EXISTS public.nexus_otros_ingresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto TEXT NOT NULL,
  monto NUMERIC NOT NULL CHECK (monto > 0),
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nexus_otros_ingresos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.nexus_otros_ingresos;
CREATE POLICY "allow_all_authenticated" ON public.nexus_otros_ingresos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Eliminar backup_tokens_cost de config (se maneja externamente)
DELETE FROM public.nexus_config WHERE clave = 'backup_tokens_cost';
