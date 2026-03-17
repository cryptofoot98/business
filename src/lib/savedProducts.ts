import { supabase } from './supabase';
import { Product } from '../types';

export interface SavedProduct {
  id: string;
  user_id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  net_weight: number;
  gross_weight: number;
  quantity?: number;
  stackable: boolean;
  fragile: boolean;
  orientation_lock: 'none' | 'upright' | 'on-side';
  priority: number;
  created_at: string;
}

export async function saveProduct(userId: string, product: Product): Promise<void> {
  const { error } = await supabase.from('saved_products').insert({
    user_id: userId,
    name: product.name,
    length: product.length,
    width: product.width,
    height: product.height,
    net_weight: product.netWeight,
    gross_weight: product.grossWeight,
    quantity: product.quantity ?? null,
    stackable: product.stackable !== false,
    fragile: product.fragile === true,
    orientation_lock: product.orientationLock ?? 'none',
    priority: product.priority ?? 5,
  });
  if (error) throw error;
}

export async function fetchSavedProducts(userId: string): Promise<SavedProduct[]> {
  const { data, error } = await supabase
    .from('saved_products')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteSavedProduct(id: string): Promise<void> {
  await supabase.from('saved_products').delete().eq('id', id);
}
