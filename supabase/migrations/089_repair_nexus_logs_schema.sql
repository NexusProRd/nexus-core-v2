-- ============================================================
-- 089 — REPAIR MIGRATION: nexus_logs schema drift
-- ============================================================
--
-- ESTA NO ES UNA NUEVA FUNCIONALIDAD.
-- NO MODIFICA EL MODELO DE DATOS.
--
-- PROPÓSITO:
-- Corrige instalaciones donde la tabla nexus_logs existía
-- antes de ejecutar la migración 019. En esos casos,
-- CREATE TABLE IF NOT EXISTS detectó que la tabla ya existía
-- y no agregó las columnas faltantes definidas en el esquema
-- original de 019_nexus_tables_pcc.sql.
--
-- COLUMNAS FALTANTES (presentes en 019, ausentes en DB):
--   accion      TEXT NOT NULL
--   detalle     TEXT
--   metadata    JSONB
--   id_usuario  UUID
--
-- Las columnas existentes (id, id_tienda, modulo, created_at)
-- no se modifican. No hay DROP, no hay ALTER destructivos.
--
-- Es COMPLETAMENTE IDEMPOTENTE: ADD COLUMN IF NOT EXISTS
-- no hace nada si la columna ya existe.
-- ============================================================

ALTER TABLE public.nexus_logs
  ADD COLUMN IF NOT EXISTS accion     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS detalle    TEXT,
  ADD COLUMN IF NOT EXISTS metadata   JSONB,
  ADD COLUMN IF NOT EXISTS id_usuario UUID;
