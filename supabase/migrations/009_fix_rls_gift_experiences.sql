-- ============================================================
-- Fix RLS policies for gift_experiences
-- Before: any authenticated user could see/update ALL stores' gifts
-- After: policies are scoped by store ownership + public can only see approved/unredeemed
-- ============================================================

-- 1. Drop all existing policies on gift_experiences
DROP POLICY IF EXISTS "Allow anonymous insert on gift_experiences" ON public.gift_experiences;
DROP POLICY IF EXISTS "Allow select on gift_experiences for authenticated" ON public.gift_experiences;
DROP POLICY IF EXISTS "Allow update on gift_experiences for authenticated" ON public.gift_experiences;

-- 2. Policy: anon/authenticated can INSERT (buying a gift)
--    Validates that the store_id references a real store (anti-spam)
CREATE POLICY "insert_gift_anyone" ON public.gift_experiences
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tiendas WHERE id = store_id)
  );

-- 3. Policy: authenticated users can SELECT only gifts belonging to their own store
CREATE POLICY "select_own_store_gifts" ON public.gift_experiences
  FOR SELECT TO authenticated
  USING (
    store_id IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  );

-- 4. Policy: authenticated users can UPDATE only gifts belonging to their own store
CREATE POLICY "update_own_store_gifts" ON public.gift_experiences
  FOR UPDATE TO authenticated
  USING (
    store_id IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  )
  WITH CHECK (
    store_id IN (SELECT id FROM public.tiendas WHERE id_owner = auth.uid())
  );

-- 5. Policy: anon users can SELECT only approved + unredeemed gifts
--    (needed for the public /canje landing page and GiftUrlDetector)
CREATE POLICY "select_public_approved_gifts" ON public.gift_experiences
  FOR SELECT TO anon
  USING (
    status = 'approved' AND is_redeemed = false
  );

-- 6. Policy: authenticated users can ALSO read any approved + unredeemed gift
--    (covers edge case where /canje page client picks up an existing session)
CREATE POLICY "select_any_approved_gift_auth" ON public.gift_experiences
  FOR SELECT TO authenticated
  USING (
    status = 'approved' AND is_redeemed = false
  );
