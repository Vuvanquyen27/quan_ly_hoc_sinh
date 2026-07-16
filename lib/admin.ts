import 'server-only'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import type { AdminAction } from '@/lib/validators/admin'

export type AdminActor = { id: string; email: string | null }

/**
 * Xác minh người gọi là ADMIN — đọc `role` từ JWT (`app_metadata.role`), KHÔNG tin
 * middleware hay client. Dùng ở ĐẦU mọi Server Action / Server Component khu admin.
 * Redirect nếu chưa đăng nhập (→ đăng nhập) hoặc không phải admin (→ trang chủ).
 */
export async function assertAdmin(): Promise<AdminActor> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap')
  const role = (user.app_metadata as { role?: string } | undefined)?.role
  if (role !== 'admin') redirect('/')
  return { id: user.id, email: user.email ?? null }
}

/**
 * Ghi một dòng nhật ký kiểm toán ADMIN bằng service_role (bỏ qua RLS).
 * BẮT BUỘC gọi sau mỗi thao tác: activate/renew/change_plan/cancel/lock/unlock/update_account.
 */
export async function writeAudit(entry: {
  actorId: string
  action: AdminAction
  targetUserId?: string | null
  targetSubscriptionId?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const admin = createAdminSupabase()
  await admin.from('admin_audit_logs').insert({
    actor_id: entry.actorId,
    action: entry.action,
    target_user_id: entry.targetUserId ?? null,
    target_subscription_id: entry.targetSubscriptionId ?? null,
    metadata: entry.metadata ?? {},
  })
}
