-- ============================================================
-- 026: Automatizar suscripciones Nexus
-- Reglas de negocio:
--   Sin token activo:
--     7 días  → bloquear dashboard  (esta_activa = false)
--     14 días → suspender catálogo  (se verifica en display)
--     30 días → eliminar tienda     (cascade delete)
--   Con token activo → asegurar que la tienda siga activa
-- ============================================================

-- RPC principal: recorre todas las tiendas activas y aplica las reglas
CREATE OR REPLACE FUNCTION public.automatizar_suscripciones_nexus()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tienda RECORD;
  processed_count int := 0;
  now_ts TIMESTAMPTZ := NOW();
BEGIN
  FOR tienda IN
    SELECT * FROM tiendas
    WHERE soft_deleted_at IS NULL
    FOR UPDATE
  LOOP
    -- Si tiene tokens activos, garantizar que siga activa
    IF tienda.tokens_disponibles IS NOT NULL AND tienda.tokens_disponibles > 0 THEN
      IF tienda.esta_activa = false THEN
        UPDATE tiendas SET esta_activa = true WHERE id = tienda.id;
      END IF;
    ELSE
      -- Sin tokens: aplicar timeline
      -- 7 días: bloquear dashboard
      IF tienda.fecha_bloqueo_panel IS NOT NULL
         AND tienda.fecha_bloqueo_panel <= now_ts
         AND tienda.esta_activa = true
      THEN
        UPDATE tiendas SET esta_activa = false WHERE id = tienda.id;
      END IF;

      -- 30 días: eliminar todo (cascade)
      IF tienda.fecha_eliminacion_total IS NOT NULL
         AND tienda.fecha_eliminacion_total <= now_ts
      THEN
        PERFORM eliminar_tienda_completa(tienda.id);
      END IF;
    END IF;

    processed_count := processed_count + 1;
  END LOOP;

  RETURN processed_count;
END;
$$;

-- Programar ejecución diaria a medianoche
SELECT cron.schedule(
  'automatizar-suscripciones',
  '0 0 * * *',
  $$SELECT automatizar_suscripciones_nexus()$$
);
