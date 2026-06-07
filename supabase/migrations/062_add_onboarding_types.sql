-- Add new business types for Sprint Conversión 4B.2
-- Aligns onboarding options with landing page hero segments:
-- ropa, accesorios, cosméticos, tecnología
-- New types behave internally as 'estandar' (no variants/tallas)

ALTER TABLE public.tiendas DROP CONSTRAINT IF EXISTS tiendas_tipo_negocio_check;

ALTER TABLE public.tiendas ADD CONSTRAINT tiendas_tipo_negocio_check
  CHECK (tipo_negocio IN (
    'estandar',
    'ropa',
    'cosmetica',
    'tecnologia',
    'colmado',
    'servicios',
    'tours'
  ));
