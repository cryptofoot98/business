import { supabase } from './supabase';
import { LoadingMode, PalletConfig, Product } from '../types';

export interface SavedLoad {
  id: string;
  user_id: string;
  name: string;
  container_id: string;
  loading_mode: LoadingMode;
  pallet_config: PalletConfig | null;
  products: Product[];
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface SaveLoadPayload {
  name: string;
  container_id: string;
  loading_mode: LoadingMode;
  pallet_config: PalletConfig | null;
  products: Product[];
  unit: string;
}

export async function fetchLoads(userId: string): Promise<SavedLoad[]> {
  const { data, error } = await supabase
    .from('loads')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SavedLoad[];
}

export async function saveLoad(userId: string, payload: SaveLoadPayload): Promise<SavedLoad> {
  const { data, error } = await supabase
    .from('loads')
    .insert({ ...payload, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data as SavedLoad;
}

export async function updateLoad(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('loads')
    .update({ name })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteLoad(id: string): Promise<void> {
  const { error } = await supabase
    .from('loads')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
