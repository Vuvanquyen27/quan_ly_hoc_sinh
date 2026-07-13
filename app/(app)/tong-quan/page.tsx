import type { Metadata } from 'next'
import { getSessionContext } from '@/lib/auth'
import { formatDate } from '@/lib/format'

export const metadata: Metadata = { title: 'Tổng quan — EduFlow' }

const STATUS_LABEL: Record<string, string> = {
  trialing: 'Đang dùng thử',
  active: 'Đang hoạt động',
  past_due: 'Quá hạn thanh toán',
  expired: 'Đã hết hạn',
  cancelled: 'Đã hủy',
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export default async function TongQuanPage() {
  const ctx = await getSessionContext()
  const name = ctx?.profile?.full_name
  const sub = ctx?.subscription

  const subValue = sub ? (STATUS_LABEL[sub.status] ?? sub.status) : '—'
  const subHint =
    sub?.status === 'trialing' && sub.trial_ends_at
      ? `Dùng thử đến ${formatDate(sub.trial_ends_at)}`
      : sub?.expires_at
        ? `Hết hạn ${formatDate(sub.expires_at)}`
        : undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Xin chào{name ? `, ${name}` : ''}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Đây là bảng điều khiển của bạn.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Thuê bao" value={subValue} hint={subHint} />
        <StatCard label="Học sinh đang học" value="—" hint="Có ở Giai đoạn 2" />
        <StatCard label="Học phí cần thu" value="—" hint="Có ở Giai đoạn 5" />
      </div>

      <p className="text-sm text-muted-foreground">
        Các tính năng quản lý học sinh, lịch dạy và tài chính sẽ xuất hiện ở các giai đoạn tiếp theo
        của lộ trình.
      </p>
    </div>
  )
}
