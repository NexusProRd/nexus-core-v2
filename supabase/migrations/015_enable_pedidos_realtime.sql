-- Habilitar el envío de eventos en tiempo real (INSERT, UPDATE) para la tabla de pedidos
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
