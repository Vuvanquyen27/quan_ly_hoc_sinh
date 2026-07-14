import { createServerSupabase } from '@/lib/supabase/server'

export type AttendanceRow = {
  id: string
  session_id: string
  student_id: string
  status: string
  homework_done: boolean | null
  note: string | null
  created_at: string
  updated_at: string
}

export type StudentAttendanceRow = AttendanceRow & {
  session_start: string | null
  session_status: string | null
  session_title: string | null
}

/** Bản ghi điểm danh của một buổi (RLS đảm bảo của chính USER). */
export async function getAttendanceForSession(sessionId: string): Promise<AttendanceRow | null> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('attendance')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()
  return (data as AttendanceRow | null) ?? null
}

/** Lịch sử điểm danh của một học sinh, JOIN buổi để hiển thị; mới nhất trước. */
export async function listAttendanceForStudent(studentId: string): Promise<StudentAttendanceRow[]> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('attendance')
    .select('*, sessions(start_time, status, title)')
    .eq('student_id', studentId)

  const rows = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>
    const s = row.sessions as { start_time?: string; status?: string; title?: string } | null
    const { sessions: _s, ...rest } = row
    return {
      ...(rest as AttendanceRow),
      session_start: s?.start_time ?? null,
      session_status: s?.status ?? null,
      session_title: s?.title ?? null,
    }
  })
  rows.sort((a, b) => (b.session_start ?? '').localeCompare(a.session_start ?? ''))
  return rows
}
