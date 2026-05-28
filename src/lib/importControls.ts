import { supabase } from './supabase';
import { ImportControl, ImportControlResults, SavedImportControl } from '../types/importControl';

export async function saveImportControl(
  userId: string,
  name: string,
  data: ImportControl,
  results: ImportControlResults,
  existingId?: string,
): Promise<SavedImportControl | null> {
  const payload = {
    name,
    data,
    results,
    updated_at: new Date().toISOString(),
  };
  if (existingId) {
    const { data: row, error } = await supabase
      .from('import_controls')
      .update(payload)
      .eq('id', existingId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return row as SavedImportControl | null;
  }
  const { data: row, error } = await supabase
    .from('import_controls')
    .insert({ user_id: userId, ...payload })
    .select()
    .maybeSingle();
  if (error) throw error;
  return row as SavedImportControl | null;
}

export async function fetchImportControls(userId: string): Promise<SavedImportControl[]> {
  const { data, error } = await supabase
    .from('import_controls')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedImportControl[];
}

export async function deleteImportControl(id: string): Promise<void> {
  const { error } = await supabase.from('import_controls').delete().eq('id', id);
  if (error) throw error;
}
