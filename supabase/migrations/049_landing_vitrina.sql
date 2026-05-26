CREATE TABLE IF NOT EXISTS public.nexus_landing_vitrina (
  clave TEXT PRIMARY KEY DEFAULT 'global',
  activo BOOLEAN DEFAULT false,
  tipo TEXT NOT NULL DEFAULT 'plantilla',
  imagen_url TEXT,
  url_redireccion TEXT,
  contenido JSONB DEFAULT '{}'::jsonb,
  plantilla_id TEXT DEFAULT 'elegante',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.nexus_landing_vitrina (clave) VALUES ('global') ON CONFLICT (clave) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.nexus_landing_vitrina_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config JSONB NOT NULL,
  imagen_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nexus_landing_vitrina ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_landing_vitrina_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.nexus_landing_vitrina;
CREATE POLICY "allow_all_authenticated" ON public.nexus_landing_vitrina
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_select_anon" ON public.nexus_landing_vitrina;
CREATE POLICY "allow_select_anon" ON public.nexus_landing_vitrina
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.nexus_landing_vitrina_historial;
CREATE POLICY "allow_all_authenticated" ON public.nexus_landing_vitrina_historial
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
