import { createServerSupabase } from '@/lib/supabase/server'

export type DocumentRow = {
  id: string
  title: string
  type: string
  storage_path: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  url: string | null
  lesson_id: string | null
  student_id: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export const DOCUMENTS_PAGE_SIZE = 20

export type DocumentList = {
  rows: DocumentRow[]
  total: number
  page: number
  pageSize: number
}

/** Danh sách tài liệu của USER hiện tại (RLS lọc theo user_id), có phân trang. */
export async function listDocuments(
  params: { search?: string; type?: string; lessonId?: string; studentId?: string; page?: number } = {},
): Promise<DocumentList> {
  const page = Math.max(1, params.page ?? 1)
  const from = (page - 1) * DOCUMENTS_PAGE_SIZE
  const to = from + DOCUMENTS_PAGE_SIZE - 1

  const supabase = await createServerSupabase()
  let q = supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (params.type) q = q.eq('type', params.type)
  if (params.lessonId) q = q.eq('lesson_id', params.lessonId)
  if (params.studentId) q = q.eq('student_id', params.studentId)
  if (params.search) q = q.ilike('title', `%${params.search}%`)

  const { data, error, count } = await q
  if (error) return { rows: [], total: 0, page, pageSize: DOCUMENTS_PAGE_SIZE }
  return { rows: (data as DocumentRow[]) ?? [], total: count ?? 0, page, pageSize: DOCUMENTS_PAGE_SIZE }
}

/** Một tài liệu theo id (RLS đảm bảo của chính USER). */
export async function getDocument(id: string): Promise<DocumentRow | null> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('documents').select('*').eq('id', id).maybeSingle()
  return (data as DocumentRow | null) ?? null
}

/** Tài liệu gắn với một bài học. */
export async function listDocumentsForLesson(lessonId: string): Promise<DocumentRow[]> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('updated_at', { ascending: false })
  return (data as DocumentRow[]) ?? []
}

/** Tài liệu gắn với một học sinh. */
export async function listDocumentsForStudent(studentId: string): Promise<DocumentRow[]> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('student_id', studentId)
    .order('updated_at', { ascending: false })
  return (data as DocumentRow[]) ?? []
}
