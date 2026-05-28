-- ============================================================
-- RECOVERY CENTER: nexus_snapshots
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nexus_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id UUID NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'manual',
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);

ALTER TABLE public.nexus_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.nexus_snapshots;
CREATE POLICY "allow_all_authenticated" ON public.nexus_snapshots
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
