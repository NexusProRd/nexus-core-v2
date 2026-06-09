-- 064_legal_acceptance.sql
-- Sprint Legal 1A: Registro de aceptacion de terminos y privacidad

ALTER TABLE public.tiendas
  ADD COLUMN IF NOT EXISTS fecha_acepto_terminos TIMESTAMPTZ;
