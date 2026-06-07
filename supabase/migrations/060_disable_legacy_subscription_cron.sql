-- ============================================================
-- 060: Disable legacy subscription automation cron
--
-- Motivo: La función automatizar_suscripciones_nexus() usa
-- lógica legacy basada en tokens_disponibles que no refleja
-- el modelo comercial actual (plan_status, plan_tipo, trial).
--
-- Si se ejecutara, pondría esta_activa=false en todas las
-- tiendas sin tokens activos — esencialmente bloqueando
-- todo el ecosistema.
--
-- Se reemplazará en una fase futura con una función que use
-- plan_status, trial_ends_at y el modelo comercial definitivo.
-- ============================================================

-- Deshabilitar el cron peligroso
SELECT cron.unschedule('automatizar-suscripciones');

-- Nota: el cron 'purge-tiendas-30d' (migración 045) es SEGURO
-- porque solo elimina tiendas con soft_deleted_at > 30 días.
-- Se mantiene activo.
