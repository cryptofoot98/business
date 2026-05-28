/*
  # Create products table

  ## Summary
  Shared product catalog sourced from the spreadsheet's DataFeed tab.
  Only the technical attributes used by costings + import-control are stored —
  sensitive fields (supplier code, FOB price, contract dates) are intentionally
  omitted.

  ## New Tables

  ### products
  - `id` (uuid, PK)
  - `product_no` (text, unique) - business product code, e.g. C10028A
  - `description` (text) - product name as it appears on packaging
  - `net_weight_kg` (numeric) - case weight
  - `container_fill_kg` (numeric) - total weight of a full FCL of this product
  - `container_fill_cases` (integer) - case count of a full FCL
  - `packs_per_case` (integer) - bags/inners per case
  - `created_by` (uuid → auth.users, nullable) - audit only
  - `created_at`, `updated_at` (timestamptz)

  ## Security
  - RLS enabled. The catalog is shared — any authenticated user can SELECT, INSERT,
    UPDATE, DELETE. (Per-user isolation would defeat the point of a shared catalog.)

  ## Indexes
  - `products_product_no_trgm`  - GIN trigram on product_no for fuzzy lookup
  - `products_description_trgm` - GIN trigram on description for fuzzy lookup
*/

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_no text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  net_weight_kg numeric NOT NULL DEFAULT 0,
  container_fill_kg numeric NOT NULL DEFAULT 0,
  container_fill_cases integer NOT NULL DEFAULT 0,
  packs_per_case integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_product_no_trgm
  ON products USING gin (product_no gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_description_trgm
  ON products USING gin (description gin_trgm_ops);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read products"
  ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_products_updated_at();
