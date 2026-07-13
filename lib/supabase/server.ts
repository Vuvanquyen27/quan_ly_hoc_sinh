import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase client cho phía máy chủ (Server Component / Server Action / Route Handler).
 * Dùng khóa anon (có RLS) và đọc/ghi cookie phiên qua @supabase/ssr.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Bỏ qua khi gọi từ Server Component (không set được cookie) —
            // middleware sẽ làm mới phiên.
          }
        },
      },
    },
  )
}
