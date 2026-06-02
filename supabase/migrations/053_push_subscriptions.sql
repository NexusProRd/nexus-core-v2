CREATE TABLE public.push_subscriptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_tienda     UUID NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (id_tienda, endpoint)
);

CREATE INDEX idx_push_subscriptions_id_tienda ON public.push_subscriptions(id_tienda);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "socio_push_subscriptions_own"
  ON public.push_subscriptions
  FOR ALL
  USING (
    id_tienda IN (SELECT id FROM public.tiendas)
  );
