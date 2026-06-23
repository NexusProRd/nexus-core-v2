ALTER TABLE pedidos ADD COLUMN metodo_pago TEXT
  CHECK (metodo_pago IN ('transferencia', 'contra_entrega'));
