ALTER TABLE public.gift_experiences ADD COLUMN IF NOT EXISTS items_list JSONB NOT NULL DEFAULT '[]'::jsonb;
