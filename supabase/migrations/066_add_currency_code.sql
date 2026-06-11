ALTER TABLE public.tiendas
  ADD COLUMN currency_code VARCHAR(3) NOT NULL DEFAULT 'DOP',
  ADD CONSTRAINT chk_currency_code CHECK (currency_code IN ('DOP', 'USD'));
