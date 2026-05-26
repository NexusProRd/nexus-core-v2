ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS tipo_articulo TEXT DEFAULT NULL
  CHECK (tipo_articulo IN ('prenda', 'calzado'));
