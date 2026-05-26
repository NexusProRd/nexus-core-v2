CREATE TABLE IF NOT EXISTS public.nexus_login_vigilado (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_tienda UUID REFERENCES public.tiendas(id) ON DELETE CASCADE,
  whatsapp_num TEXT NOT NULL,
  nombre_tienda TEXT NOT NULL,
  ip TEXT NOT NULL,
  user_agent TEXT,
  navegador TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  notificado BOOLEAN DEFAULT FALSE,
  ignorado BOOLEAN DEFAULT FALSE
);
