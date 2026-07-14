'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { sessionSchema, SESSION_STATUSES } from '@/lib/validators/session'
import { vnLocalToUtc } from '@/lib/datetime'

export type SessionActionState = { error?: string } | null

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
    studentId: String(formData.get('studentId') ?? ''),
    lessonId: String(formData.get('lessonId') ?? ''),
    title: String(formData.get('title') ?? ''),
    startTime: String(formData.get('startTime') ?? ''),
    endTime: String(formData.get('endTime') ?? ''),
    mode: String(formData.get('mode') ?? 'offline'),
    location: String(formData.get('location') ?? ''),
    feeAmount: String(formData.get('feeAmount') ?? '0'),
  }
}

/** Tạo hoặc cập nhật buổi học (field ẩn `id`). */
export async function saveSession(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = sessionSchema.safeParse(readForm(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  const id = formData.get('id') ? String(formData.get('id')) : null

  // Học phí: nếu để trống/0 khi tạo mới → lấy students.default_fee.
  let fee = d.feeAmount
  if (!id && (!fee || fee === 0)) {
    const { data: st } = await supabase
      .from('students').select('default_fee').eq('id', d.studentId).maybeSingle()
    if (st?.default_fee != null) fee = st.default_fee as number
  }

  const row = {
    student_id: d.studentId,
    lesson_id: d.lessonId || null,
    title: d.title || null,
    start_time: vnLocalToUtc(d.startTime),
    end_time: vnLocalToUtc(d.endTime),
    mode: d.mode,
    location: d.location || null,
    fee_amount: fee,
  }

  if (id) {
    const { error } = await supabase.from('sessions').update(row).eq('id', id)
    if (error) return { error: 'Không cập nhật được buổi học.' }
  } else {
    // Không truyền user_id — CSDL đặt mặc định auth.uid().
    const { error } = await supabase.from('sessions').insert(row)
    if (error) return { error: 'Không lưu được buổi học.' }
  }

  revalidatePath('/lich-day')
  redirect('/lich-day')
}

/** Chuyển trạng thái buổi (scheduled → completed/cancelled). Hủy cần lý do. */
export async function changeSessionStatus(formData: FormData): Promise<void> {
  const guard = await requireWritable()
  if (guard) return
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  const cancelReason = String(formData.get('cancelReason') ?? '')
  if (!id || !SESSION_STATUSES.includes(status as (typeof SESSION_STATUSES)[number])) return
  if (status === 'cancelled' && !cancelReason.trim()) return

  const supabase = await createServerSupabase()
  const { data: current } = await supabase
    .from('sessions').select('status').eq('id', id).maybeSingle()
  if (!current || current.status !== 'scheduled') return

  const { error } = await supabase
    .from('sessions')
    .update({ status, cancel_reason: status === 'cancelled' ? cancelReason : null })
    .eq('id', id)
  if (error) {
    console.error('changeSessionStatus lỗi:', id, error.message)
    return
  }
  revalidatePath('/lich-day')
}
