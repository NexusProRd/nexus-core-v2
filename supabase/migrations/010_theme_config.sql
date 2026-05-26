-- Add theme_config JSONB column to perfil_tienda for palette selection
ALTER TABLE perfil_tienda 
ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT NULL;

COMMENT ON COLUMN perfil_tienda.theme_config IS '{"palette": "elegante"} — stores the selected palette name';
