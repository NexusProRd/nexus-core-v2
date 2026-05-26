-- Add slug and codigo_barra columns to productos
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS codigo_barra TEXT;

-- Create index for slug lookups (used in product detail route)
CREATE INDEX IF NOT EXISTS idx_productos_slug ON public.productos (slug);

-- Allow null slugs initially (existing rows), then add unique constraint per store
-- Note: Unique constraint per store ensures slugs don't collide within a store
CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_slug_tienda ON public.productos (slug, id_tienda) WHERE slug IS NOT NULL;
