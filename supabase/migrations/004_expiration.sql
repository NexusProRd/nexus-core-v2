ALTER TABLE public.gift_experiences 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.gift_experiences 
DROP CONSTRAINT IF EXISTS gift_experiences_status_check;

ALTER TABLE public.gift_experiences 
ADD CONSTRAINT gift_experiences_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'expired'));
