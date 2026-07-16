import type { Metadata } from 'next'
import Link from 'next/link'
import { getPlatformStats } from '@/server/admin/queries'
import { SUB_STATUS_LABEL } from '@/lib/validators/admin'
import { buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Tổng quan — Admin EduFlow' }

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value.toLocaleString('vi-VN')}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

const STATUS_ORDER = ['active', 'trialing', 'past_due', 'expired', 'cancelled'] as const

export default async function AdminHomePage() {
  const stats = await getPlatformStats()

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tổng quan nền tảng</h1>
        <Link href="/admin/tai-khoan" className={buttonVariants({ variant: 'outline' })}>
          Quản lý tài khoản
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng tài khoản" value={stats.totalUsers} />
        <StatCard label="Mới trong 30 ngày" value={stats.newLast30Days} />
        <StatCard label="Đang bị khóa" value={stats.lockedCount} />
        <StatCard
          label="Đang hoạt động"
          value={stats.byStatus['active'] ?? 0}
          hint="Thuê bao trả phí còn hạn"
        />
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-medium text-foreground">Tài khoản theo trạng thái thuê bao</h2>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {STATUS_ORDER.map((s) => (
            <div key={s} className="rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground">{SUB_STATUS_LABEL[s]}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {(stats.byStatus[s] ?? 0).toLocaleString('vi-VN')}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Chỉ số liệu tổng hợp — khu ADMIN không truy cập dữ liệu nghiệp vụ (học sinh, lịch dạy, tài chính) của USER.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/goi" className={buttonVariants({ variant: 'outline' })}>Quản lý gói</Link>
        <Link href="/admin/nhat-ky" className={buttonVariants({ variant: 'outline' })}>Nhật ký kiểm toán</Link>
      </div>
    </div>
  )
}
