import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const AUTH_PATHS = ['/dang-nhap', '/dang-ky', '/quen-mat-khau']
const APP_PATHS = [
  '/tong-quan', '/hoc-sinh', '/bai-hoc', '/tai-lieu',
  '/lich-day', '/tai-chinh', '/bao-cao', '/cai-dat', '/onboarding',
]

function redirectPreservingCookies(url: URL, from: NextResponse) {
  const res = NextResponse.redirect(url)
  from.cookies.getAll().forEach((c) => res.cookies.set(c))
  return res
}

// Next.js 16: convention "middleware" đã đổi tên thành "proxy".
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const path = request.nextUrl.pathname

  const isAuth = AUTH_PATHS.some((p) => path === p || path.startsWith(p + '/'))
  const isApp = APP_PATHS.some((p) => path === p || path.startsWith(p + '/'))
  const isAdmin = path === '/admin' || path.startsWith('/admin/')

  // Chưa đăng nhập mà vào khu vực app/admin → chuyển tới đăng nhập
  if (!user && (isApp || isAdmin)) {
    return redirectPreservingCookies(new URL('/dang-nhap', request.url), response)
  }

  // Đã đăng nhập mà vào trang auth → chuyển tới tổng quan
  if (user && isAuth) {
    return redirectPreservingCookies(new URL('/tong-quan', request.url), response)
  }

  // Khu admin: chỉ cho phép vai trò admin (đọc từ JWT app_metadata)
  if (isAdmin && user) {
    const role = (user.app_metadata as { role?: string } | undefined)?.role
    if (role !== 'admin') {
      return redirectPreservingCookies(new URL('/', request.url), response)
    }
  }

  return response
}

export const config = {
  matcher: [
    // Áp cho mọi route trừ file tĩnh & ảnh
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
