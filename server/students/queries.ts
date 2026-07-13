import { createServerSupabase } from '@/lib/supabase/server'

export type Student = {
  id: string
  full_name: string
  date_of_birth: string | null
  gender: string | null
  grade_level: string | null
  subjects: string[]
  phone: string | null
  email: string | null
  parent_name: string | null
  parent_phone: string | null
  address: string | null
  default_fee: number
  fee_type: string
  status: string
  notes: string | null
  created_at: string
}

/** Danh sách học sinh của USER hiện tại (RLS lọc theo user_id). */
export async function listStudents(params: { search?: string; status?: string } = {}): Promise<Student[]> {
  const supabase = await createServerSupabase()
  let q = supabase
    .from('students')
    .select('*')
    .is('archived_at', null)
    .order('full_name', { ascending: true })

  if (params.status) q = q.eq('status', params.status)
  if (params.search) q = q.ilike('full_name', `%${params.search}%`)

  const { data, error } = await q
  if (error) return []
  return (data as Student[]) ?? []
}

/** Một học sinh theo id (RLS đảm bảo của chính USER). */
export async function getStudent(id: string): Promise<Student | null> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('students').select('*').eq('id', id).maybeSingle()
  return (data as Student | null) ?? null
}
