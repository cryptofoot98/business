import { supabase } from './supabase';
import { Product, NewProductInput } from '../types/product';

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('product_no', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function createProduct(userId: string, input: NewProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({ ...input, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, patch: Partial<NewProductInput>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}
