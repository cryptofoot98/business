/*
  # Create costing_calculations table

  ## Summary
  This migration creates a table to persist import costing calculations for users.
  Each record stores the full set of inputs and computed results for one costing scenario.

  ## New Tables

  ### costing_calculations
  - `id` (uuid, PK) - Unique identifier
  - `user_id` (uuid, FK → auth.users) - Owner of the calculation
  - `name` (text) - User-assigned name for this calculation
  - `trade_route` (text) - e.g. "china-uk", "thailand-eu"
  - `inputs` (jsonb) - All form inputs: product cost, freight, clearance, transport, insurance
  - `results` (jsonb) - Computed totals: landed cost, duty total, margin, break-even, etc.
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled: users can only SELECT, INSERT, UPDATE, DELETE their own records

  ## Indexes
  - Index on (user_id, updated_at DESC) for efficient user-specific queries
*/

CREATE TABLE IF NOT EXISTS costing_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  trade_route text NOT NULL DEFAULT 'china-uk',
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS costing_calculations_user_updated
  ON costing_calculations(user_id, updated_at DESC);

ALTER TABLE costing_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own costing calculations"
  ON costing_calculations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own costing calculations"
  ON costing_calculations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own costing calculations"
  ON costing_calculations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own costing calculations"
  ON costing_calculations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
