ALTER TABLE public.tiendas ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.tiendas ADD COLUMN IF NOT EXISTS slug_actualizado BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tiendas_slug ON public.tiendas (slug) WHERE slug IS NOT NULL;

-- Actualizar el permiso de lectura anónima para que pueda consultar slug
-- (se usa en la ruta /c/[slug])
