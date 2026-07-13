import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Làm mới phiên Supabase ở middleware và đồng bộ cookie.
 * (Chặn route theo vai trò /admin và gating thuê bao sẽ bổ sung ở Giai đoạn 1 & 9.)
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Làm mới phiên (nếu cấu hình Supabase chưa sẵn sàng thì bỏ qua, không làm hỏng request).
  try {
    await supabase.auth.getUser()
  } catch {
    // Bỏ qua — sẽ hoạt động khi biến môi trường Supabase thật được điền.
  }

  return response
}
