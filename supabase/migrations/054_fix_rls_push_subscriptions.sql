DROP POLICY IF EXISTS "socio_push_subscriptions_own" ON public.push_subscriptions;

CREATE POLICY "socio_push_subscriptions_own"
  ON public.push_subscriptions
  FOR ALL
  USING (
    id_tienda IN (SELECT id FROM public.tiendas)
  );
