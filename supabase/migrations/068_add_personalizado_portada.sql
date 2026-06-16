ALTER TABLE public.portadas
  ADD COLUMN cta_url TEXT,
  ADD COLUMN cta_pestana TEXT,
  ADD COLUMN cta_categoria TEXT;

ALTER TABLE public.portadas
  DROP CONSTRAINT IF EXISTS portadas_tipo_check,
  ADD CONSTRAINT portadas_tipo_check CHECK (tipo IN ('institucional', 'producto', 'oferta', 'personalizado'));

ALTER TABLE public.portadas
  DROP CONSTRAINT IF EXISTS portadas_cta_accion_check,
  ADD CONSTRAINT portadas_cta_accion_check CHECK (cta_accion IN ('ver_productos', 'ver_producto', 'ir_a_pestana', 'url_externa'));
