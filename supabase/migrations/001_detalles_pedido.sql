-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Tabla de detalles del pedido
CREATE TABLE IF NOT EXISTS public.detalles_pedido (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_pedido UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  id_producto UUID REFERENCES public.productos(id) ON DELETE SET NULL,
  producto TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Agregar columna cliente_telefono si no existe
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS cliente_telefono TEXT;

-- 3. RLS para detalles_pedido
ALTER TABLE public.detalles_pedido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de detalles_pedido"
ON public.detalles_pedido FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Insertar detalles_pedido"
ON public.detalles_pedido FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 4. Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.detalles_pedido;
