-- ============================================================
-- 057: Seed commercial plan configuration keys into nexus_config
-- ============================================================

INSERT INTO public.nexus_config (clave, valor) VALUES
  ('plan_emprendedor_price', '380'),
  ('plan_emprendedor_limit', '15'),
  ('plan_pro_price', '900'),
  ('plan_pro_limit', '-1')
ON CONFLICT (clave) DO NOTHING;
