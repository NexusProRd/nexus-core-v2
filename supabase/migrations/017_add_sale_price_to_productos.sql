-- Agregar columna de precio de oferta a la tabla productos
ALTER TABLE public.productos 
ADD COLUMN IF NOT EXISTS precio_oferta DECIMAL(10,2) DEFAULT NULL;

-- Constraint de seguridad: El precio de oferta debe ser menor al precio normal y mayor que cero
ALTER TABLE public.productos
DROP CONSTRAINT IF EXISTS check_precio_oferta_coherente;

ALTER TABLE public.productos
ADD CONSTRAINT check_precio_oferta_coherente
CHECK (precio_oferta IS NULL OR (precio_oferta < precio AND precio_oferta > 0));

COMMENT ON COLUMN public.productos.precio_oferta IS 'Almacena el precio rebajado del producto. Si es NULL, se vende al precio normal.';
