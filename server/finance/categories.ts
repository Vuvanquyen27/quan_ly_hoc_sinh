import { createServerSupabase } from '@/lib/supabase/server'

export type CategoryRow = {
  id: string
  kind: string
  name: string
  is_archived: boolean
}

/** Danh mục thu/chi (RLS lọc theo user_id). */
export async function listCategories(params?: {
  kind?: string
  includeArchived?: boolean
}): Promise<CategoryRow[]> {
  const supabase = await createServerSupabase()
  let q = supabase
    .from('categories')
    .select('id, kind, name, is_archived')
    .order('kind', { ascending: true })
    .order('name', { ascending: true })
  if (params?.kind) q = q.eq('kind', params.kind)
  if (!params?.includeArchived) q = q.eq('is_archived', false)

  const { data } = await q
  return (data ?? []) as CategoryRow[]
}
