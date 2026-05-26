-- Add tallas JSONB column to productos (stores size array for 'ropa' type)
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS tallas JSONB DEFAULT '[]'::jsonb;
