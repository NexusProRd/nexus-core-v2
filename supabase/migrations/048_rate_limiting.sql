CREATE TABLE IF NOT EXISTS nexus_rate_limits (
  ip TEXT PRIMARY KEY,
  intentos INTEGER NOT NULL DEFAULT 0,
  bloqueado_hasta TIMESTAMPTZ,
  ultimo_intento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ultimo_intento ON nexus_rate_limits(ultimo_intento);
