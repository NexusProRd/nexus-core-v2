CREATE TABLE IF NOT EXISTS nexus_disenos_biblioteca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tienda UUID NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT 'Diseño sin título',
  tipo TEXT NOT NULL DEFAULT 'whatsapp_story',
  config JSONB NOT NULL DEFAULT '{}',
  preview_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disenos_biblioteca_tienda ON nexus_disenos_biblioteca(id_tienda);

ALTER TABLE nexus_disenos_biblioteca ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Disenos insert own" ON nexus_disenos_biblioteca
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Disenos select own" ON nexus_disenos_biblioteca
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Disenos update own" ON nexus_disenos_biblioteca
    FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Disenos delete own" ON nexus_disenos_biblioteca
    FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
