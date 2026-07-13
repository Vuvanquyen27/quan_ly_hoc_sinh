import { createServerSupabase } from '@/lib/supabase/server'

export type Lesson = {
  id: string
  title: string
  subject: string | null
  grade_level: string | null
  description: string | null
  content: string | null
  tags: string[]
  status: string
  created_at: string
  updated_at: string
}

export const LESSONS_PAGE_SIZE = 20

export type LessonList = { rows: Lesson[]; total: number; page: number; pageSize: number }

/** Danh sách bài học của USER hiện tại (RLS lọc theo user_id), có phân trang. */
export async function listLessons(
  params: { search?: string; subject?: string; status?: string; page?: number } = {},
): Promise<LessonList> {
  const page = Math.max(1, params.page ?? 1)
  const from = (page - 1) * LESSONS_PAGE_SIZE
  const to = from + LESSONS_PAGE_SIZE - 1

  const supabase = await createServerSupabase()
  let q = supabase
    .from('lessons')
    .select('*', { count: 'exact' })
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (params.subject) q = q.eq('subject', params.subject)
  if (params.status) q = q.eq('status', params.status)
  if (params.search) q = q.ilike('title', `%${params.search}%`)

  const { data, error, count } = await q
  if (error) return { rows: [], total: 0, page, pageSize: LESSONS_PAGE_SIZE }
  return {
    rows: (data as Lesson[]) ?? [],
    total: count ?? 0,
    page,
    pageSize: LESSONS_PAGE_SIZE,
  }
}

/** Một bài học theo id (RLS đảm bảo của chính USER). */
export async function getLesson(id: string): Promise<Lesson | null> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('lessons').select('*').eq('id', id).maybeSingle()
  return (data as Lesson | null) ?? null
}
