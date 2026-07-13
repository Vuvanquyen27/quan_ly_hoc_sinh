import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client với service_role — BỎ QUA RLS.
 * CHỈ dùng ở máy chủ cho tác vụ ADMIN (quản lý tài khoản/thuê bao) SAU khi đã xác minh role=admin.
 * `import 'server-only'` khiến build THẤT BẠI nếu lỡ import tệp này ở phía client — hàng rào an toàn.
 */
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
