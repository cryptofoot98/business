/*
  # Create loads table

  1. New Tables
    - `loads`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, cascade delete)
      - `name` (text) - user-defined label for the saved load plan
      - `container_id` (text) - identifier of the selected container type
      - `loading_mode` (text) - 'handload' or 'pallet'
      - `pallet_config` (jsonb, nullable) - pallet configuration when loading_mode is 'pallet'
      - `products` (jsonb) - array of product objects in the load plan
      - `unit` (text) - measurement unit used (e.g. 'cm', 'mm', 'in')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `loads` table
    - Users can SELECT, INSERT, UPDATE, DELETE only their own loads

  3. Notes
    - The `products` and `pallet_config` columns store JSON arrays/objects as jsonb
    - `updated_at` is used for ordering loads by most recently modified
*/

CREATE TABLE IF NOT EXISTS loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  container_id text NOT NULL DEFAULT '',
  loading_mode text NOT NULL DEFAULT 'handload' CHECK (loading_mode IN ('handload', 'pallet')),
  pallet_config jsonb,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  unit text NOT NULL DEFAULT 'cm',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loads_user_id_updated_at_idx ON loads (user_id, updated_at DESC);

ALTER TABLE loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loads"
  ON loads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loads"
  ON loads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loads"
  ON loads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own loads"
  ON loads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
