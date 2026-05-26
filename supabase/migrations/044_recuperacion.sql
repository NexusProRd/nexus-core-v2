ALTER TABLE public.tiendas
ADD COLUMN IF NOT EXISTS preguntas_recuperacion JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.tiendas
ADD COLUMN IF NOT EXISTS codigo_verificacion_hash TEXT;

ALTER TABLE public.tiendas
ADD COLUMN IF NOT EXISTS solicita_cambio BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tiendas
ADD COLUMN IF NOT EXISTS token_recuperacion TEXT;

ALTER TABLE public.tiendas
ADD COLUMN IF NOT EXISTS token_expira TIMESTAMPTZ;
