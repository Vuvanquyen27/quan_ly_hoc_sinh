import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { signOutAction } from '@/server/auth/actions'
import { Button } from '@/components/ui/button'
import { DesktopNav, BottomNav } from '@/components/app-nav'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/dang-nhap')

  if (ctx.profile?.is_locked) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
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
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/tong-quan"
              className="font-mono text-sm font-semibold tracking-[0.28em] text-primary"
            >
              EDUFLOW
            </Link>
            <DesktopNav />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{ctx.user.email}</span>
            <ThemeToggle />
            <form action={signOutAction}>
              <Button variant="outline" size="sm">Đăng xuất</Button>
            </form>
          </div>
        </div>
      </header>

      {readOnly && (
        <div className="border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm text-foreground sm:px-6">
          Thuê bao đã hết hạn — bạn đang ở chế độ chỉ đọc.{' '}
          <Link href="/cai-dat" className="font-medium underline">Gia hạn ngay</Link>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 md:pb-8">{children}</main>
      <BottomNav />
    </div>
  )
}
