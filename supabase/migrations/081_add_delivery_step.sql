-- ============================================================
-- 081: Add delivery_step for guided CLAIMED operational flow
--
-- Tracks the store's progress within CLAIMED:
--   NULL       → store must contact the recipient
--   CONTACTED  → store contacted, must notify shipping
--   SHIPPED    → shipped, ready to mark as delivered
--
-- Does NOT create new business statuses.
-- Main status (CLAIMED) stays unchanged.
-- ============================================================

ALTER TABLE public.gift_experiences
  ADD COLUMN delivery_step TEXT;

COMMENT ON COLUMN public.gift_experiences.delivery_step IS
  'Operational delivery flow inside CLAIMED: NULL → CONTACTED → SHIPPED';

CREATE INDEX idx_gift_experiences_delivery_step
  ON public.gift_experiences(delivery_step)
  WHERE delivery_step IS NOT NULL;
