-- ============================================================
-- Script de verificación de cron jobs
-- Ejecutar contra la base de datos de producción:
--
--   psql "$SUPABASE_DB_URL" -f scripts/check-cron-jobs.sql
--
-- O desde el SQL Editor de Supabase Dashboard.
-- ============================================================

-- 1. Verificar extensión pg_cron
SELECT EXISTS(
  SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
) AS pg_cron_installed;

-- 2. Listar todos los cron jobs
SELECT
  job_name,
  schedule,
  active,
  last_run,
  next_run,
  command
FROM cron.job;

-- 3. Verificar estado específico
SELECT
  job_name,
  CASE
    WHEN active THEN 'ACTIVO'
    ELSE 'INACTIVO'
  END AS estado,
  last_run,
  next_run
FROM cron.job
WHERE job_name IN ('automatizar-suscripciones', 'purge-tiendas-30d');
