import Link from 'next/link'
import { assertAdmin } from '@/lib/admin'
import { signOutAction } from '@/server/auth/actions'
import { Button } from '@/components/ui/button'
import { AdminNav, AdminBottomNav } from '@/components/admin/admin-nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { ShieldCheck } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Xác minh lại vai trò ở server (không chỉ dựa vào proxy/middleware).
  const admin = await assertAdmin()

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/admin"
              className="flex items-center gap-2 font-mono text-sm font-semibold tracking-[0.28em] text-primary"
            >
              <ShieldCheck className="size-5" />
              ADMIN
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{admin.email}</span>
            <Link
              href="/tong-quan"
              className="rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Về ứng dụng
            </Link>
            <ThemeToggle />
            <form action={signOutAction}>
              <Button variant="outline" size="sm">Đăng xuất</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 md:pb-8">{children}</main>
      <AdminBottomNav />
    </div>
  )
}
