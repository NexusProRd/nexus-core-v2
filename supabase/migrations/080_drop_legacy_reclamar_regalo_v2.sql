-- ============================================================
-- 080: Drop legacy overload of reclamar_regalo_v2
--
-- Migration 069 created: reclamar_regalo_v2(TEXT, UUID)
-- Migration 079 created: reclamar_regalo_v2(TEXT, UUID, TEXT DEFAULT NULL)
-- Both coexisted causing PGRST203 ambiguity.
-- This drops the original 2-param overload (069), keeping only the 3-param version (079).
-- ============================================================

DROP FUNCTION IF EXISTS public.reclamar_regalo_v2(p_gift_code TEXT, p_store_id UUID);
