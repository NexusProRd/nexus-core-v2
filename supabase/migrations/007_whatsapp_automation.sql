ALTER TABLE public.perfil_tienda 
ADD COLUMN IF NOT EXISTS notify_orders_whatsapp BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.perfil_tienda 
ADD COLUMN IF NOT EXISTS notify_gifts_whatsapp BOOLEAN NOT NULL DEFAULT true;
