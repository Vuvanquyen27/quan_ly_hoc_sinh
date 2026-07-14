import { createServerSupabase } from '@/lib/supabase/server'

export type SessionRow = {
  id: string
  student_id: string
  student_name: string | null
  lesson_id: string | null
  title: string | null
  start_time: string
  end_time: string
  mode: string
  location: string | null
  status: string
  fee_amount: number
  is_billed: boolean
  cancel_reason: string | null
  created_at: string
  updated_at: string
}

const SELECT = '*, students(full_name)'

function flatten(row: Record<string, unknown>): SessionRow {
  const student = row.students as { full_name?: string } | null
  const { students: _s, ...rest } = row
  return { ...(rest as Omit<SessionRow, 'student_name'>), student_name: student?.full_name ?? null }
}

/** Buổi học trong khoảng [fromIso, toIso) (RLS lọc theo user_id), sắp theo giờ bắt đầu. */
export async function listSessions(params: {
  fromIso: string
  toIso: string
  status?: string
  studentId?: string
}): Promise<SessionRow[]> {
  const supabase = await createServerSupabase()
  let q = supabase
    .from('sessions')
    .select(SELECT)
    .gte('start_time', params.fromIso)
    .lt('start_time', params.toIso)
    .order('start_time', { ascending: true })

  if (params.status) q = q.eq('status', params.status)
  if (params.studentId) q = q.eq('student_id', params.studentId)

  const { data } = await q
  return (data ?? []).map((r) => flatten(r as Record<string, unknown>))
}

/** Một buổi theo id (RLS đảm bảo của chính USER). */
export async function getSession(id: string): Promise<SessionRow | null> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('sessions').select(SELECT).eq('id', id).maybeSingle()
  return data ? flatten(data as Record<string, unknown>) : null
}
