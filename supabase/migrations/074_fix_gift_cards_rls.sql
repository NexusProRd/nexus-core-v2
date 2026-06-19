-- ============================================================
-- 074: Fix gift_cards + gift_card_transactions RLS policies
--
-- Sprint 3G-Prep: Soluciona H5 (RLS demasiado permisivo).
--
-- Antes: SELECT permitía a anon + authenticated leer TODAS las filas
--        sin filtro de store_id. UPDATE sin restricción de tienda.
-- Después: Mismo patrón que gift_experiences (migración 009):
--   - SELECT: solo authenticated, scoped por store ownership
--   - INSERT: permissive (RPC SECURITY DEFINER bypasses)
--   - UPDATE: solo authenticated, scoped por store ownership
-- ============================================================

-- ============================================================
-- 1. gift_cards
-- ============================================================
DROP POLICY IF EXISTS "Allow insert on gift_cards for anon" ON public.gift_cards;
DROP POLICY IF EXISTS "Allow select on gift_cards for authenticated" ON public.gift_cards;
DROP POLICY IF EXISTS "Allow update on gift_cards for authenticated" ON public.gift_cards;

-- INSERT: anyone (used by RPC convertir_regalo_a_giftcard_v2 which is SECURITY DEFINER)
CREATE POLICY "insert_gift_cards" ON public.gift_cards
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tiendas WHERE id = store_id)
  );

-- SELECT: only store owner
CREATE POLICY "select_gift_cards_own_store" ON public.gift_cards
  FOR SELECT TO authenticated
  USING (
    store_id IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  );

-- UPDATE: only store owner
CREATE POLICY "update_gift_cards_own_store" ON public.gift_cards
  FOR UPDATE TO authenticated
  USING (
    store_id IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  )
  WITH CHECK (
    store_id IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  );

-- ============================================================
-- 2. gift_card_transactions
-- ============================================================
DROP POLICY IF EXISTS "Allow insert on gift_card_transactions for anon" ON public.gift_card_transactions;
DROP POLICY IF EXISTS "Allow select on gift_card_transactions for authenticated" ON public.gift_card_transactions;

-- INSERT: anyone (used by RPC)
CREATE POLICY "insert_gct" ON public.gift_card_transactions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- SELECT: only store owner (via gift_cards ownership chain)
CREATE POLICY "select_gct_own_store" ON public.gift_card_transactions
  FOR SELECT TO authenticated
  USING (
    gift_card_id IN (
      SELECT id FROM public.gift_cards
      WHERE store_id IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
    )
  );
