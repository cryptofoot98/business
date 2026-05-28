/*
  # Create import_controls table

  ## Summary
  Per-user persistence for the Import Control sheet (post-arrival container
  reconciliation). One row per imported container.

  ## New Tables

  ### import_controls
  - `id` (uuid, PK)
  - `user_id` (uuid → auth.users) - owner
  - `name` (text) - user-assigned name
  - `data` (jsonb) - header + costs + clearance + products
  - `results` (jsonb) - computed totals + per-product cost/margin
  - `created_at`, `updated_at` (timestamptz)

  ## Security
  - RLS enabled, per-user isolation (matches costing_calculations).
*/

CREATE TABLE IF NOT EXISTS import_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS import_controls_user_updated
  ON import_controls(user_id, updated_at DESC);

ALTER TABLE import_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own import controls"
  ON import_controls FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own import controls"
  ON import_controls FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own import controls"
  ON import_controls FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own import controls"
  ON import_controls FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_import_controls_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER import_controls_set_updated_at
  BEFORE UPDATE ON import_controls
  FOR EACH ROW EXECUTE FUNCTION update_import_controls_updated_at();
