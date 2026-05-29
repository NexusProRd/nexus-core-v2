-- 051: WhatsApp Templates — persistencia por tienda
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  confirmado TEXT DEFAULT '',
  preparando TEXT DEFAULT '',
  en_camino TEXT DEFAULT '',
  entregado TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_store_template UNIQUE (store_id)
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_anon" ON public.whatsapp_templates
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
