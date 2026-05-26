-- PCC Login — password almacenada en nexus_config
INSERT INTO public.nexus_config (clave, valor)
VALUES ('pcc_password', 'Germ@shlib21')
ON CONFLICT (clave) DO NOTHING;
