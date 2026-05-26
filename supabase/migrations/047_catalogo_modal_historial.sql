CREATE TABLE IF NOT EXISTS nexus_catalogo_modal_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tienda UUID NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  imagen_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalogo_historial_tienda ON nexus_catalogo_modal_historial(id_tienda);

ALTER TABLE nexus_catalogo_modal_historial ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Historial insert own" ON nexus_catalogo_modal_historial
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Historial select own" ON nexus_catalogo_modal_historial
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Historial delete own" ON nexus_catalogo_modal_historial
    FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
