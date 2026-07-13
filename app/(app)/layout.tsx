import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { signOutAction } from '@/server/auth/actions'
import { Button } from '@/components/ui/button'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/dang-nhap')

  if (ctx.profile?.is_locked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-4 text-center text-[#1f2933]">
        <div className="max-w-md">
          <h1 className="text-xl font-semibold">Tài khoản đã bị khóa</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vui lòng liên hệ quản trị viên để được hỗ trợ.
          </p>
          <form action={signOutAction} className="mt-4">
            <Button variant="outline">Đăng xuất</Button>
          </form>
        </div>
      </main>
    )
  }

  const readOnly = isReadOnly(ctx)

  return (
    <div className="min-h-screen bg-[#f7f3ea] text-[#1f2933]">
      <header className="border-b border-[#d8cbb4] bg-[#fffaf0]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/tong-quan"
              className="font-mono text-sm font-semibold tracking-[0.28em] text-[#315c48]"
            >
              EDUFLOW
            </Link>
            <nav className="hidden items-center gap-4 text-sm sm:flex">
              <Link href="/tong-quan" className="text-[#3a4a41] hover:text-[#315c48]">Tổng quan</Link>
              <Link href="/hoc-sinh" className="text-[#3a4a41] hover:text-[#315c48]">Học sinh</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">{ctx.user.email}</span>
            <form action={signOutAction}>
              <Button variant="outline" size="sm">Đăng xuất</Button>
            </form>
          </div>
        </div>
      </header>

      {readOnly && (
        <div className="bg-amber-100 px-6 py-2 text-center text-sm text-amber-900">
          Thuê bao đã hết hạn — bạn đang ở chế độ chỉ đọc.{' '}
          <Link href="/cai-dat" className="font-medium underline">Gia hạn ngay</Link>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
