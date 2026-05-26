ALTER TABLE public.tiendas
ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE public.tiendas
ADD COLUMN IF NOT EXISTS dispositivo_id_hash TEXT;

ALTER TABLE public.tiendas
ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMPTZ;

ALTER TABLE public.tiendas
ADD COLUMN IF NOT EXISTS telefono_socio TEXT;

INSERT INTO public.nexus_config (clave, valor)
VALUES ('whatsapp_api_key', '')
ON CONFLICT (clave) DO NOTHING;
