ALTER TABLE public.detalles_pedido
  ADD COLUMN IF NOT EXISTS variante_seleccionada TEXT;
