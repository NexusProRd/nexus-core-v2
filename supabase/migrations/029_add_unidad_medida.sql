-- Add unidad_medida column to productos (libra/unidad for 'colmado' type)
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS unidad_medida TEXT
  CHECK (unidad_medida IN ('libra', 'unidad'));
