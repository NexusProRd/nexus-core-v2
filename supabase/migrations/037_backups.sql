-- ============================================================
-- 037: Backups automáticos — nexus_backups
-- ============================================================

-- 1. nexus_backups — Backup snapshots
CREATE TABLE IF NOT EXISTS public.nexus_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tienda UUID REFERENCES public.tiendas(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'manual' CHECK (tipo IN ('manual', 'automatico')),
  data JSONB NOT NULL,
  size_bytes INTEGER DEFAULT 0,
  tokens_cost INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nexus_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.nexus_backups;
CREATE POLICY "allow_all_authenticated" ON public.nexus_backups
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Default token cost for backup operations
INSERT INTO public.nexus_config (clave, valor)
VALUES ('backup_tokens_cost', '5')
ON CONFLICT (clave) DO NOTHING;
