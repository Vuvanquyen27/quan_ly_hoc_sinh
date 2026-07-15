import type { Metadata } from 'next'
import Link from 'next/link'
import { getSessionContext } from '@/lib/auth'
import { dashboardStats, upcomingSessions, cashflowMonthly } from '@/server/reports/queries'
import { listUpcomingDue } from '@/server/finance/ledger'
import { formatDate, formatVND, formatDateTime } from '@/lib/format'
import { CashflowChart } from '@/components/reports/cashflow-chart'

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

  const [stats, upcoming, due, cashflow] = await Promise.all([
    dashboardStats(),
    upcomingSessions(),
    listUpcomingDue(),
    cashflowMonthly(6),
  ])

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Học sinh đang học" value={String(stats.activeStudents)} />
        <StatCard label="Buổi sắp tới (7 ngày)" value={String(stats.upcomingCount)} />
        <StatCard label="Học phí cần thu" value={formatVND(stats.receivableTotal)} />
        <StatCard
          label="Dòng tiền tháng này"
          value={formatVND(stats.monthIncome - stats.monthExpense)}
          hint={`Thu ${formatVND(stats.monthIncome)} · Chi ${formatVND(stats.monthExpense)}`}
        />
      </div>

      {due.overdue.length > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-destructive">Quá hạn ({due.overdue.length})</h2>
            <Link href="/bao-cao" className="text-sm text-primary hover:underline">Xem báo cáo →</Link>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {due.overdue.slice(0, 5).map((r) => (
              <li key={`${r.kind}-${r.id}`} className="flex justify-between">
                <Link href={r.kind === 'receivable' ? `/tai-chinh/phai-thu/${r.id}` : `/tai-chinh/phai-tra/${r.id}`} className="text-foreground hover:underline">
                  {r.kind === 'receivable' ? 'Thu' : 'Trả'} · {r.name ?? '—'}
                </Link>
                <span className="text-muted-foreground">{formatVND(r.remaining)} · {formatDate(r.due_date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">Buổi sắp tới</h2>
            <Link href="/lich-day" className="text-sm text-primary hover:underline">Lịch dạy →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có buổi nào trong 7 ngày tới.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {upcoming.slice(0, 6).map((s) => (
                <li key={s.id} className="flex justify-between py-2">
                  <span className="text-foreground">{s.student_name ?? '—'}</span>
                  <span className="text-muted-foreground">{formatDateTime(s.start_time)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">Dòng tiền 6 tháng</h2>
            <Link href="/bao-cao" className="text-sm text-primary hover:underline">Báo cáo →</Link>
          </div>
          <CashflowChart data={cashflow} />
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Thuê bao" value={subValue} hint={subHint} />
      </div>
    </div>
  )
}
