-- Add tipo_negocio column to tiendas (estandar = current flow)
ALTER TABLE public.tiendas
  ADD COLUMN IF NOT EXISTS tipo_negocio TEXT NOT NULL DEFAULT 'estandar'
  CHECK (tipo_negocio IN ('estandar', 'ropa', 'colmado', 'servicios', 'tours'));
