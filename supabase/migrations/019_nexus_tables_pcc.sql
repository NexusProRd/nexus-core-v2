-- ============================================================
-- 019: Create all missing Nexus system tables + RPC functions
-- Tables: nexus_config, nexus_logs, nexus_anuncios, nexus_revendedores
-- RPC: eliminar_tienda_completa
-- ============================================================

-- 1. nexus_config — Global key-value configuration
CREATE TABLE IF NOT EXISTS public.nexus_config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nexus_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.nexus_config;
CREATE POLICY "allow_all_authenticated" ON public.nexus_config
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default WhatsApp support number
INSERT INTO public.nexus_config (clave, valor)
VALUES ('whatsapp_soporte', '18299999999')
ON CONFLICT (clave) DO NOTHING;

-- 2. nexus_logs — Black box audit log
CREATE TABLE IF NOT EXISTS public.nexus_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tienda UUID REFERENCES public.tiendas(id) ON DELETE SET NULL,
  id_usuario UUID,
  modulo TEXT NOT NULL,
  accion TEXT NOT NULL,
  detalle TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nexus_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.nexus_logs;
CREATE POLICY "allow_all_authenticated" ON public.nexus_logs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. nexus_anuncios — Global dashboard announcements
CREATE TABLE IF NOT EXISTS public.nexus_anuncios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  contenido TEXT,
  tipo TEXT NOT NULL DEFAULT 'actualizacion',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nexus_anuncios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.nexus_anuncios;
CREATE POLICY "allow_all_authenticated" ON public.nexus_anuncios
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. nexus_revendedores — Reseller network
CREATE TABLE IF NOT EXISTS public.nexus_revendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  comision_porcentaje INTEGER NOT NULL DEFAULT 10,
  codigo_referido TEXT UNIQUE NOT NULL,
  tiendas_asociadas UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nexus_revendedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.nexus_revendedores;
CREATE POLICY "allow_all_authenticated" ON public.nexus_revendedores
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Add email column to tiendas (optional, for recovery/notifications)
ALTER TABLE public.tiendas ADD COLUMN IF NOT EXISTS email TEXT;

-- 6. Make id_owner nullable (for WhatsApp-only registration without auth.users)
ALTER TABLE public.tiendas ALTER COLUMN id_owner DROP NOT NULL;

-- 7. RPC: eliminar_tienda_completa — Full cascade delete bypassing RLS
CREATE OR REPLACE FUNCTION public.eliminar_tienda_completa(tienda_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM detalles_pedido WHERE id_pedido IN (SELECT id FROM pedidos WHERE id_tienda = tienda_id);
  DELETE FROM pedidos WHERE id_tienda = tienda_id;
  DELETE FROM productos WHERE id_tienda = tienda_id;
  DELETE FROM perfil_tienda WHERE id_tienda = tienda_id;
  DELETE FROM gift_experiences WHERE store_id = tienda_id;
  DELETE FROM tickets WHERE store_id = tienda_id;
  DELETE FROM coupons WHERE store_id = tienda_id;
  DELETE FROM nexus_logs WHERE id_tienda = tienda_id;
  DELETE FROM tiendas WHERE id = tienda_id;
END;
$$;

-- 8. Add DELETE policies for all child tables (fallback for client-side deletes)
DO $$
DECLARE
  policies TEXT[][] := ARRAY[
    ARRAY['gift_experiences', 'delete_gift_experiences'],
    ARRAY['tickets', 'delete_tickets'],
    ARRAY['coupons', 'delete_coupons'],
    ARRAY['perfil_tienda', 'delete_perfil_tienda'],
    ARRAY['pedidos', 'delete_pedidos'],
    ARRAY['productos', 'delete_productos'],
    ARRAY['detalles_pedido', 'delete_detalles_pedido'],
    ARRAY['nexus_logs', 'delete_nexus_logs']
  ];
  i TEXT[];
BEGIN
  FOREACH i SLICE 1 IN ARRAY policies
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', i[2], i[1]);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (true)', i[2], i[1]);
  END LOOP;
END $$;
