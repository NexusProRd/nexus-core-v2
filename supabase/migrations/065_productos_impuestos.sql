ALTER TABLE public.productos
  ADD COLUMN aplica_impuesto BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN porcentaje_impuesto NUMERIC(5,2) DEFAULT NULL;
