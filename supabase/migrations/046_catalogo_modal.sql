CREATE TABLE IF NOT EXISTS public.nexus_catalogo_modal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tienda UUID NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT false,
  tipo TEXT NOT NULL DEFAULT 'plantilla',
  imagen_url TEXT,
  url_redireccion TEXT,
  contenido JSONB DEFAULT '{}'::jsonb,
  plantilla_id TEXT DEFAULT 'elegante',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nexus_catalogo_modal_id_tienda ON public.nexus_catalogo_modal(id_tienda);

ALTER TABLE public.nexus_catalogo_modal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.nexus_catalogo_modal;
CREATE POLICY "allow_all_authenticated" ON public.nexus_catalogo_modal
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_anon" ON public.nexus_catalogo_modal;
CREATE POLICY "allow_all_anon" ON public.nexus_catalogo_modal
  FOR SELECT TO anon
  USING (true);
