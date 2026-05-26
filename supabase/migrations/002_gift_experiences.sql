CREATE TABLE IF NOT EXISTS public.gift_experiences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL,
    sender_name TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    personal_message TEXT,
    product_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
    gift_code TEXT UNIQUE,
    is_redeemed BOOLEAN NOT NULL DEFAULT false,
    sender_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    approved_at TIMESTAMPTZ,
    items_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gift_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert on gift_experiences"
ON public.gift_experiences FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow select on gift_experiences for authenticated"
ON public.gift_experiences FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow update on gift_experiences for authenticated"
ON public.gift_experiences FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_experiences;
