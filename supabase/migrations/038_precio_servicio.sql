-- ============================================================
-- 038: Precio único del servicio en nexus_config
-- ============================================================

INSERT INTO public.nexus_config (clave, valor)
VALUES ('precio_servicio', '49')
ON CONFLICT (clave) DO NOTHING;
