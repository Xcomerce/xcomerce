import { supabase } from '@/lib/supabase'
import type { Tables } from '@keve/shared'

export type Category = Tables<'categories'>

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Category[]
}
