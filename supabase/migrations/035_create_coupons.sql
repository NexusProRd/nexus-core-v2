-- Create coupons table for discount codes
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL,
    code TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    value NUMERIC NOT NULL CHECK (value > 0),
    min_purchase_amount NUMERIC DEFAULT 0,
    usage_limit INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_coupon_code_per_store UNIQUE (store_id, code)
);

-- RLS (mirrors pattern from tickets table)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on coupons for authenticated"
ON public.coupons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert on coupons for authenticated"
ON public.coupons FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update on coupons for authenticated"
ON public.coupons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete on coupons for authenticated"
ON public.coupons FOR DELETE TO authenticated USING (true);

-- Allow anon read for catalog (validating coupon codes)
CREATE POLICY "Allow select on coupons for anon"
ON public.coupons FOR SELECT TO anon USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
