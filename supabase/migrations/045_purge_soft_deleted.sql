CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.purge_soft_deleted_tiendas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tienda RECORD;
BEGIN
  FOR tienda IN
    SELECT id FROM tiendas
    WHERE soft_deleted_at IS NOT NULL
      AND soft_deleted_at < NOW() - INTERVAL '30 days'
  LOOP
    PERFORM eliminar_tienda_completa(tienda.id);
  END LOOP;
END;
$$;

SELECT cron.schedule('purge-tiendas-30d', '0 3 * * *', 'SELECT public.purge_soft_deleted_tiendas();');
