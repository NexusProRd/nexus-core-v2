CREATE TABLE IF NOT EXISTS public.nexus_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('fijo', 'variable')),
  concepto TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL DEFAULT 0,
  periodicidad TEXT NOT NULL DEFAULT 'mensual' CHECK (periodicidad IN ('mensual', 'unico')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nexus_gastos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_authenticated" ON public.nexus_gastos FOR ALL TO authenticated USING (true) WITH CHECK (true);
