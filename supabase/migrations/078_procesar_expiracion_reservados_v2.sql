-- ============================================================
-- 078: Batch RPC para expiración automática de regalos RESERVED
--
-- Sprint 3G: Procesa regalos RESERVED vencidos en batches de 50.
-- Reutiliza convertir_regalo_a_giftcard_v2() para la conversión.
--
-- FOR UPDATE SKIP LOCKED: evita procesar el mismo regalo dos veces
-- en ejecuciones concurrentes del cron.
--
-- Infraestructura lista para cron. El scheduling se activa
-- manualmente desde Supabase Dashboard con:
--
--   SELECT cron.schedule(
--     'gift-expiration',
--     '0 */6 * * *',
--     $$SELECT procesar_expiracion_reservados_v2()$$
--   );
--
-- Para desactivar:
--   SELECT cron.unschedule('gift-expiration');
-- ============================================================

CREATE OR REPLACE FUNCTION public.procesar_expiracion_reservados_v2()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_gift RECORD;
  v_result JSONB;
BEGIN
  FOR v_gift IN
    SELECT id FROM public.gift_experiences
    WHERE status = 'RESERVED'
      AND reserved_expires_at < NOW()
      AND converted_to_giftcard_at IS NULL
    FOR UPDATE SKIP LOCKED
    LIMIT 50
  LOOP
    v_result := public.convertir_regalo_a_giftcard_v2(v_gift.id);

    IF (v_result->>'success')::BOOLEAN THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed', v_count
  );
END;
$$;

COMMENT ON FUNCTION public.procesar_expiracion_reservados_v2() IS
  'Batch RPC para expiración automática. Procesa hasta 50 regalos RESERVED vencidos por llamada.
   Reutiliza convertir_regalo_a_giftcard_v2() internamente.
   Las Gift Cards resultantes heredan el gift_config de la tienda.
   Para activar cron: SELECT cron.schedule(...) desde Supabase Dashboard.
   Cada 6 horas recomendado.';
