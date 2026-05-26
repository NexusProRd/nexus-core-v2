-- Add ganancia_neta column to pedidos (calculated profit when order is confirmed)
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS ganancia_neta NUMERIC DEFAULT 0;
