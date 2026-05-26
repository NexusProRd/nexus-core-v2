-- Add 'cancelled' status to gift_experiences CHECK constraint
ALTER TABLE public.gift_experiences
  DROP CONSTRAINT IF EXISTS gift_experiences_status_check,
  ADD CONSTRAINT gift_experiences_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled'));
