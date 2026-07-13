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

export const STUDENTS_PAGE_SIZE = 20

export type StudentList = { rows: Student[]; total: number; page: number; pageSize: number }

/** Danh sách học sinh của USER hiện tại (RLS lọc theo user_id), có phân trang. */
export async function listStudents(
  params: { search?: string; status?: string; page?: number } = {},
): Promise<StudentList> {
  const page = Math.max(1, params.page ?? 1)
  const from = (page - 1) * STUDENTS_PAGE_SIZE
  const to = from + STUDENTS_PAGE_SIZE - 1

  const supabase = await createServerSupabase()
  let q = supabase
    .from('students')
    .select('*', { count: 'exact' })
    .is('archived_at', null)
    .order('full_name', { ascending: true })
    .range(from, to)

  if (params.status) q = q.eq('status', params.status)
  if (params.search) q = q.ilike('full_name', `%${params.search}%`)

  const { data, error, count } = await q
  if (error) return { rows: [], total: 0, page, pageSize: STUDENTS_PAGE_SIZE }
  return {
    rows: (data as Student[]) ?? [],
    total: count ?? 0,
    page,
    pageSize: STUDENTS_PAGE_SIZE,
  }
}

/** Một học sinh theo id (RLS đảm bảo của chính USER). */
export async function getStudent(id: string): Promise<Student | null> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('students').select('*').eq('id', id).maybeSingle()
  return (data as Student | null) ?? null
}
