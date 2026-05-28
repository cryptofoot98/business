// Simplified product catalog row, sourced from the DataFeed tab.
// Sensitive fields (supplier code, FOB price, contract dates) are intentionally NOT
// stored — only the technical attributes used downstream by the costings + import-
// control workflows.

export interface Product {
  id: string;
  product_no: string;
  description: string;
  net_weight_kg: number;
  container_fill_kg: number;
  container_fill_cases: number;
  packs_per_case: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type NewProductInput = Pick<
  Product,
  'product_no' | 'description' | 'net_weight_kg' | 'container_fill_kg' | 'container_fill_cases' | 'packs_per_case'
>;
