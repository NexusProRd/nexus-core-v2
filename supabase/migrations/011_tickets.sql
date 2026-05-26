-- Add is_gift flag to pedidos
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT false;

-- Create tickets table for gift order coupon codes
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    code TEXT UNIQUE NOT NULL,
    is_redeemed BOOLEAN NOT NULL DEFAULT false,
    gift_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on tickets for authenticated"
ON public.tickets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert on tickets for authenticated"
ON public.tickets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update on tickets for authenticated"
ON public.tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
