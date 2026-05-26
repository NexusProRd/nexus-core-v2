-- Update unidad_medida check constraint to allow servicio/producto values
ALTER TABLE public.productos DROP CONSTRAINT IF EXISTS productos_unidad_medida_check;

ALTER TABLE public.productos
  ADD CONSTRAINT productos_unidad_medida_check
  CHECK (unidad_medida IS NULL OR unidad_medida IN ('libra', 'unidad', 'servicio', 'producto'));
