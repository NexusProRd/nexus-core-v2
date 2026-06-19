-- ============================================================
-- 071: Gift Cards Foundation
--
-- Sprint 3: gift_cards table, gift_card_transactions, gift_config,
--           receiver_phone, converted_to_giftcard_at
-- ============================================================

-- ============================================================
-- 1. Add gift_config to tiendas (JSONB, schema-less)
-- ============================================================
ALTER TABLE public.tiendas
  ADD COLUMN gift_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tiendas.gift_config IS
  'Per-store gift rules: { reserved_expires_days, claimed_expires_days, gift_card_expires_days }';

-- ============================================================
-- 2. Add receiver_phone to gift_experiences
-- ============================================================
ALTER TABLE public.gift_experiences
  ADD COLUMN receiver_phone TEXT;

-- ============================================================
-- 3. Add converted_to_giftcard_at to gift_experiences
-- ============================================================
ALTER TABLE public.gift_experiences
  ADD COLUMN converted_to_giftcard_at TIMESTAMPTZ;

CREATE INDEX idx_gift_experiences_converted
  ON public.gift_experiences(converted_to_giftcard_at)
  WHERE converted_to_giftcard_at IS NOT NULL;

-- ============================================================
-- 4. Create gift_cards table
-- ============================================================
CREATE TABLE public.gift_cards (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  original_gift_id  UUID REFERENCES public.gift_experiences(id) ON DELETE SET NULL,
  code              TEXT NOT NULL,
  initial_value     NUMERIC(10,2) NOT NULL CHECK (initial_value > 0),
  balance           NUMERIC(10,2) NOT NULL CHECK (balance >= 0),
  recipient_name    TEXT,
  recipient_phone   TEXT,
  status            TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  redeemed_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_gift_cards_code ON public.gift_cards(upper(code));
CREATE INDEX idx_gift_cards_store ON public.gift_cards(store_id);
CREATE INDEX idx_gift_cards_original_gift ON public.gift_cards(original_gift_id);

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

-- RLS: alineado con el patrón existente de gift_experiences
CREATE POLICY "Allow insert on gift_cards for anon"
  ON public.gift_cards FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow select on gift_cards for authenticated"
  ON public.gift_cards FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow update on gift_cards for authenticated"
  ON public.gift_cards FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. Create gift_card_transactions table
-- ============================================================
CREATE TABLE public.gift_card_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id  UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  amount        NUMERIC(10,2) NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('creation', 'redemption', 'expiration', 'cancellation')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gct_gift_card ON public.gift_card_transactions(gift_card_id);
CREATE INDEX idx_gct_order ON public.gift_card_transactions(order_id);

ALTER TABLE public.gift_card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert on gift_card_transactions for anon"
  ON public.gift_card_transactions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow select on gift_card_transactions for authenticated"
  ON public.gift_card_transactions FOR SELECT TO anon, authenticated USING (true);
