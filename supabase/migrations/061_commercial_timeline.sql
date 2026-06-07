-- ============================================================
-- 061: Commercial Timeline — cron v2 + trial date correction
-- Idempotent: safe to run multiple times.
-- Separates plan_tipo (contractual) from plan_status (operational).
-- ============================================================

-- 1. Fix trial dates for existing stores still in trial
UPDATE public.tiendas
SET
  fecha_suspension_catalogo = trial_started_at + INTERVAL '45 days',
  fecha_eliminacion_total   = trial_started_at + INTERVAL '61 days'
WHERE plan_status = 'trial'
  AND trial_started_at IS NOT NULL
  AND (fecha_eliminacion_total IS NULL OR fecha_eliminacion_total > NOW());

-- 2. New cron function (v2) — replaces old automatizar_suscripciones_nexus()
--    Only transitions plan_status. Never touches plan_tipo or token_productos_limite.
CREATE OR REPLACE FUNCTION public.automatizar_suscripciones_v2()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tienda RECORD;
  processed int := 0;
  now_ts TIMESTAMPTZ := NOW();
BEGIN
  FOR tienda IN
    SELECT * FROM tiendas
    WHERE soft_deleted_at IS NULL
      AND is_founder = false
    FOR UPDATE
  LOOP
    -- Trial → Dashboard Suspended (no grace for trial)
    IF tienda.plan_status = 'trial'
       AND tienda.fecha_bloqueo_panel IS NOT NULL
       AND tienda.fecha_bloqueo_panel <= now_ts
    THEN
      UPDATE tiendas
      SET plan_status = 'dashboard_suspended',
          esta_activa = false
      WHERE id = tienda.id;
    END IF;

    -- Active → Grace (subscription expired, within grace window)
    IF tienda.plan_status = 'active'
       AND tienda.fecha_vencimiento IS NOT NULL
       AND tienda.fecha_vencimiento <= now_ts
    THEN
      UPDATE tiendas
      SET plan_status = 'grace'
      WHERE id = tienda.id;
    END IF;

    -- Grace → Dashboard Suspended (grace expired)
    IF tienda.plan_status = 'grace'
       AND tienda.fecha_bloqueo_panel IS NOT NULL
       AND tienda.fecha_bloqueo_panel <= now_ts
    THEN
      UPDATE tiendas
      SET plan_status = 'dashboard_suspended',
          esta_activa = false
      WHERE id = tienda.id;
    END IF;

    -- Dashboard Suspended → Catalog Suspended
    IF tienda.plan_status = 'dashboard_suspended'
       AND tienda.fecha_suspension_catalogo IS NOT NULL
       AND tienda.fecha_suspension_catalogo <= now_ts
    THEN
      UPDATE tiendas
      SET plan_status = 'catalog_suspended'
      WHERE id = tienda.id;
    END IF;

    -- Any terminal → Deleted (soft delete)
    IF tienda.plan_status IN ('catalog_suspended', 'dashboard_suspended')
       AND tienda.fecha_eliminacion_total IS NOT NULL
       AND tienda.fecha_eliminacion_total <= now_ts
    THEN
      UPDATE tiendas
      SET plan_status = 'deleted',
          soft_deleted_at = now_ts,
          esta_activa = false
      WHERE id = tienda.id;
    END IF;

    processed := processed + 1;
  END LOOP;
  RETURN processed;
END;
$$;

-- 3. Clean up old cron schedules (idempotent — no error if missing)
SELECT cron.unschedule('automatizar-suscripciones');
SELECT cron.unschedule('automatizar-suscripciones-v2');

-- 4. Schedule new cron at midnight daily
SELECT cron.schedule(
  'automatizar-suscripciones-v2',
  '0 0 * * *',
  $$SELECT automatizar_suscripciones_v2()$$
);
