/*
  # Fix RLS policy performance: wrap auth.uid() in (select auth.uid())

  ## Summary
  All RLS policies across profiles, chat_messages, saved_products, loads, and
  costing_calculations are re-created to use `(select auth.uid())` instead of
  `auth.uid()` directly. This prevents Postgres from re-evaluating the function
  once per row, significantly improving query performance at scale.

  Also fixes:
  - handle_new_user function gets a fixed search_path to prevent mutable search_path vulnerability
  - Unused composite/single-column indexes are dropped and replaced with simple btree
    indexes that the query planner can actually use
*/

-- ============================================================
-- profiles
-- ============================================================
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================
-- chat_messages
-- ============================================================
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.chat_messages;

CREATE POLICY "Users can view own chat messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own chat messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own chat messages"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- saved_products
-- ============================================================
DROP POLICY IF EXISTS "Users can view own saved products" ON public.saved_products;
DROP POLICY IF EXISTS "Users can insert own saved products" ON public.saved_products;
DROP POLICY IF EXISTS "Users can delete own saved products" ON public.saved_products;

CREATE POLICY "Users can view own saved products"
  ON public.saved_products FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own saved products"
  ON public.saved_products FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own saved products"
  ON public.saved_products FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- loads
-- ============================================================
DROP POLICY IF EXISTS "Users can view own loads" ON public.loads;
DROP POLICY IF EXISTS "Users can insert own loads" ON public.loads;
DROP POLICY IF EXISTS "Users can update own loads" ON public.loads;
DROP POLICY IF EXISTS "Users can delete own loads" ON public.loads;

CREATE POLICY "Users can view own loads"
  ON public.loads FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own loads"
  ON public.loads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own loads"
  ON public.loads FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own loads"
  ON public.loads FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- costing_calculations
-- ============================================================
DROP POLICY IF EXISTS "Users can read own costing calculations" ON public.costing_calculations;
DROP POLICY IF EXISTS "Users can insert own costing calculations" ON public.costing_calculations;
DROP POLICY IF EXISTS "Users can update own costing calculations" ON public.costing_calculations;
DROP POLICY IF EXISTS "Users can delete own costing calculations" ON public.costing_calculations;

CREATE POLICY "Users can read own costing calculations"
  ON public.costing_calculations FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own costing calculations"
  ON public.costing_calculations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own costing calculations"
  ON public.costing_calculations FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own costing calculations"
  ON public.costing_calculations FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- Fix handle_new_user search_path vulnerability
-- ============================================================
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- ============================================================
-- Replace unused indexes with simple user_id btree indexes
-- ============================================================
DROP INDEX IF EXISTS public.saved_products_user_id_idx;
DROP INDEX IF EXISTS public.loads_user_id_updated_at_idx;
DROP INDEX IF EXISTS public.costing_calculations_user_updated;

CREATE INDEX IF NOT EXISTS saved_products_user_id_idx ON public.saved_products (user_id);
CREATE INDEX IF NOT EXISTS loads_user_id_idx ON public.loads (user_id);
CREATE INDEX IF NOT EXISTS costing_calculations_user_id_idx ON public.costing_calculations (user_id);
