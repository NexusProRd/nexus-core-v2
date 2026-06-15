CREATE TABLE public.portadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tienda UUID NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('institucional', 'producto', 'oferta')),
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  imagen_url TEXT,
  titulo TEXT,
  descripcion TEXT,
  id_producto UUID REFERENCES public.productos(id) ON DELETE SET NULL,
  cta_texto TEXT,
  cta_accion TEXT NOT NULL DEFAULT 'ver_productos' CHECK (cta_accion IN ('ver_productos', 'ver_producto')),
  duracion_ms INTEGER NOT NULL DEFAULT 5000 CHECK (duracion_ms >= 2000),
  creado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portadas_tienda_activo ON public.portadas(id_tienda, activo) WHERE activo = true;
CREATE INDEX idx_portadas_tienda_orden ON public.portadas(id_tienda, orden);

ALTER TABLE public.portadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_portadas" ON public.portadas
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "insert_portadas" ON public.portadas
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "update_portadas" ON public.portadas
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "delete_portadas" ON public.portadas
  FOR DELETE TO anon, authenticated
  USING (true);
