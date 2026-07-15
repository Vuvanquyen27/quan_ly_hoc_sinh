'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { upcomingSessions } from '@/server/reports/queries'
import { listUpcomingDue } from '@/server/finance/ledger'
import { formatVND, formatDate, formatDateTime } from '@/lib/format'

async function currentUserId(): Promise<string | null> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Đánh dấu 1 thông báo đã đọc. */
export async function markRead(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const supabase = await createServerSupabase()
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  revalidatePath('/thong-bao')
}

/** Đánh dấu tất cả đã đọc. */
export async function markAllRead(): Promise<void> {
  const supabase = await createServerSupabase()
  await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
  revalidatePath('/thong-bao')
}

/** Xóa 1 thông báo. */
export async function deleteNotification(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const supabase = await createServerSupabase()
  await supabase.from('notifications').delete().eq('id', id)
  revalidatePath('/thong-bao')
}

/** Sinh nhắc nhở từ buổi sắp tới + khoản quá hạn (dedup theo type+entity_id, gate prefs). */
export async function generateReminders(): Promise<void> {
  const uid = await currentUserId()
  if (!uid) return
  const supabase = await createServerSupabase()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('notify_session_reminder, notify_payment_due')
    .eq('user_id', uid)
    .maybeSingle()

  const candidates: {
    type: 'session_reminder' | 'payment_due'
    title: string
    body: string
    entity_type: string
    entity_id: string
  }[] = []

  if (settings?.notify_session_reminder ?? true) {
    const sessions = await upcomingSessions()
    for (const s of sessions) {
      candidates.push({
        type: 'session_reminder',
        title: `Buổi sắp tới: ${s.student_name ?? '—'}`,
        body: formatDateTime(s.start_time),
        entity_type: 'session',
        entity_id: s.id,
      })
    }
  }
  if (settings?.notify_payment_due ?? true) {
    const { overdue } = await listUpcomingDue()
    for (const d of overdue) {
      candidates.push({
        type: 'payment_due',
        title: `Quá hạn ${d.kind === 'receivable' ? 'thu' : 'trả'}: ${d.name ?? '—'}`,
        body: `${formatVND(d.remaining)} · hạn ${formatDate(d.due_date)}`,
        entity_type: d.kind === 'receivable' ? 'invoice' : 'payable',
        entity_id: d.id,
      })
    }
  }

  if (candidates.length === 0) return

  // Dedup theo (type, entity_id) đã tồn tại
  const { data: existing } = await supabase
    .from('notifications')
    .select('type, entity_id')
    .in(
      'entity_id',
      candidates.map((c) => c.entity_id),
    )
  const seen = new Set((existing ?? []).map((e) => `${e.type}:${e.entity_id}`))
  const toInsert = candidates.filter((c) => !seen.has(`${c.type}:${c.entity_id}`))
  if (toInsert.length === 0) return

  // Không truyền user_id — CSDL đặt mặc định auth.uid().
  const { error } = await supabase.from('notifications').insert(toInsert)
  if (error) {
    console.error('generateReminders lỗi:', error.message)
    return
  }
  revalidatePath('/thong-bao')
}
