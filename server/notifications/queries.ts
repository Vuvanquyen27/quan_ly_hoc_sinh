import { createServerSupabase } from '@/lib/supabase/server'

export const NOTIFICATIONS_PAGE_SIZE = 30

export type NotificationRow = {
  id: string
  type: string
  title: string
  body: string | null
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  created_at: string
}

/** Danh sách thông báo (mới nhất trước), phân trang. */
export async function listNotifications(params: { page?: number } = {}): Promise<{
  rows: NotificationRow[]
  total: number
  page: number
  pageSize: number
}> {
  const page = params.page && params.page > 0 ? params.page : 1
  const from = (page - 1) * NOTIFICATIONS_PAGE_SIZE
  const to = from + NOTIFICATIONS_PAGE_SIZE - 1
  const supabase = await createServerSupabase()
  const { data, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  return {
    rows: (data ?? []) as NotificationRow[],
    total: count ?? 0,
    page,
    pageSize: NOTIFICATIONS_PAGE_SIZE,
  }
}

/** Số thông báo chưa đọc. */
export async function unreadCount(): Promise<number> {
  const supabase = await createServerSupabase()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
  return count ?? 0
}
