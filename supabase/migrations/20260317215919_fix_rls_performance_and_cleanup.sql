/*
  # Fix RLS performance, unused indexes, and function search path

  1. RLS Policy Fixes (trq_licences + trq_usage_log)
     - Replace `auth.uid()` with `(select auth.uid())` in all policies on both tables
     - This prevents per-row re-evaluation of auth functions, improving query performance at scale

  2. Drop Unused Indexes
     - idx_trq_licences_quota_order on trq_licences
     - idx_trq_usage_licence_id on trq_usage_log
     - idx_trq_usage_costing_id on trq_usage_log
     - idx_tariff_cache_key on tariff_cache
     - idx_tariff_cache_expires on tariff_cache
     - costing_calculations_user_id_idx on costing_calculations

  3. Fix Function Search Path
     - Set search_path = '' on update_trq_licences_updated_at to prevent mutable search path vulnerability
*/

-- ============================================================
-- trq_licences: drop and recreate all 4 policies
-- ============================================================

DROP POLICY IF EXISTS "Users can view own TRQ licences" ON public.trq_licences;
DROP POLICY IF EXISTS "Users can insert own TRQ licences" ON public.trq_licences;
DROP POLICY IF EXISTS "Users can update own TRQ licences" ON public.trq_licences;
DROP POLICY IF EXISTS "Users can delete own TRQ licences" ON public.trq_licences;

CREATE POLICY "Users can view own TRQ licences"
  ON public.trq_licences FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own TRQ licences"
  ON public.trq_licences FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own TRQ licences"
  ON public.trq_licences FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own TRQ licences"
  ON public.trq_licences FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- trq_usage_log: drop and recreate all 4 policies
-- ============================================================

DROP POLICY IF EXISTS "Users can view own TRQ usage" ON public.trq_usage_log;
DROP POLICY IF EXISTS "Users can insert own TRQ usage" ON public.trq_usage_log;
DROP POLICY IF EXISTS "Users can update own TRQ usage" ON public.trq_usage_log;
DROP POLICY IF EXISTS "Users can delete own TRQ usage" ON public.trq_usage_log;

CREATE POLICY "Users can view own TRQ usage"
  ON public.trq_usage_log FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own TRQ usage"
  ON public.trq_usage_log FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own TRQ usage"
  ON public.trq_usage_log FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own TRQ usage"
  ON public.trq_usage_log FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- Drop unused indexes
-- ============================================================

DROP INDEX IF EXISTS public.idx_trq_licences_quota_order;
DROP INDEX IF EXISTS public.idx_trq_usage_licence_id;
DROP INDEX IF EXISTS public.idx_trq_usage_costing_id;
DROP INDEX IF EXISTS public.idx_tariff_cache_key;
DROP INDEX IF EXISTS public.idx_tariff_cache_expires;
DROP INDEX IF EXISTS public.costing_calculations_user_id_idx;

-- ============================================================
-- Fix mutable search_path on trigger function
-- ============================================================

ALTER FUNCTION public.update_trq_licences_updated_at() SET search_path = '';
