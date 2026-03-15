/*
  # Create saved_products table

  1. New Tables
    - `saved_products`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text) - product name
      - `length` (numeric) - in cm
      - `width` (numeric) - in cm
      - `height` (numeric) - in cm
      - `net_weight` (numeric) - in kg
      - `gross_weight` (numeric) - in kg
      - `quantity` (integer, nullable) - optional target quantity
      - `stackable` (boolean) - stacking allowed
      - `fragile` (boolean) - fragile flag
      - `orientation_lock` (text) - 'none' | 'upright' | 'on-side'
      - `priority` (integer) - 1-10
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `saved_products` table
    - Users can only access their own saved products
*/

CREATE TABLE IF NOT EXISTS saved_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  length numeric NOT NULL DEFAULT 0,
  width numeric NOT NULL DEFAULT 0,
  height numeric NOT NULL DEFAULT 0,
  net_weight numeric NOT NULL DEFAULT 0,
  gross_weight numeric NOT NULL DEFAULT 0,
  quantity integer,
  stackable boolean NOT NULL DEFAULT true,
  fragile boolean NOT NULL DEFAULT false,
  orientation_lock text NOT NULL DEFAULT 'none' CHECK (orientation_lock IN ('none', 'upright', 'on-side')),
  priority integer NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved products"
  ON saved_products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved products"
  ON saved_products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved products"
  ON saved_products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS saved_products_user_id_idx ON saved_products (user_id, created_at DESC);
