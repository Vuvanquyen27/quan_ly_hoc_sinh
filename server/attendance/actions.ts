'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { attendanceSchema } from '@/lib/validators/attendance'

export type AttendanceActionState = { error?: string } | null

async function requireWritable(): Promise<{ error: string } | null> {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/dang-nhap')
  if (isReadOnly(ctx)) {
    return { error: 'Tài khoản đang ở chế độ chỉ đọc (thuê bao hết hạn hoặc bị khóa).' }
  }
  return null
}

function readForm(formData: FormData) {
  return {
    sessionId: String(formData.get('sessionId') ?? ''),
    status: String(formData.get('status') ?? ''),
    homeworkDone: String(formData.get('homeworkDone') ?? ''),
    note: String(formData.get('note') ?? ''),
  }
}

/** Ghi/cập nhật điểm danh cho buổi (upsert theo session_id+student_id). */
export async function saveAttendance(
  _prev: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = attendanceSchema.safeParse(readForm(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()

  // Lấy student_id + trạng thái buổi (RLS chỉ trả buổi của chính USER).
  const { data: sess } = await supabase
    .from('sessions')
    .select('student_id, status')
    .eq('id', d.sessionId)
    .maybeSingle()
  if (!sess) return { error: 'Không tìm thấy buổi học.' }
  if (sess.status === 'cancelled') return { error: 'Buổi đã hủy, không thể điểm danh.' }

  const homework =
    d.homeworkDone === 'true' ? true : d.homeworkDone === 'false' ? false : null

  // Upsert theo ràng buộc UNIQUE(session_id, student_id).
  // Không truyền user_id — CSDL đặt mặc định auth.uid().
  const { error } = await supabase.from('attendance').upsert(
    {
      session_id: d.sessionId,
      student_id: sess.student_id as string,
      status: d.status,
      homework_done: homework,
      note: (d.note ?? '').trim() || null,
    },
    { onConflict: 'session_id,student_id' },
  )
  if (error) return { error: 'Không lưu được điểm danh.' }

  revalidatePath(`/lich-day/${d.sessionId}/sua`)
  revalidatePath(`/hoc-sinh/${sess.student_id}`)
  redirect(`/lich-day/${d.sessionId}/sua`)
}
