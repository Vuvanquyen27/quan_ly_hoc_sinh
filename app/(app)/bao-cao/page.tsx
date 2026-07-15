import type { Metadata } from 'next'
import Link from 'next/link'
import { cashflowRange, reportSummary, receivablesOutstanding, payablesOutstanding } from '@/server/reports/queries'
import { listUpcomingDue } from '@/server/finance/ledger'
import { vnYearMonth } from '@/lib/reports'
import { formatVND, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { CashflowChart } from '@/components/reports/cashflow-chart'

export const metadata: Metadata = { title: 'Báo cáo — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

type SearchParams = { from?: string; to?: string }

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'income' | 'expense' | 'net' }) {
  const color = tone === 'income' ? 'text-success' : tone === 'expense' ? 'text-destructive' : 'text-foreground'
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}

/** 'YYYY-MM' lùi k tháng. */
function shiftYM(ym: string, k: number): string {
  const [y, m] = ym.split('-').map(Number)
  let yy = y
  let mm = m - k
  while (mm <= 0) { mm += 12; yy -= 1 }
  while (mm > 12) { mm -= 12; yy += 1 }
  return `${yy}-${String(mm).padStart(2, '0')}`
}

export default async function BaoCaoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const nowYm = vnYearMonth(new Date())
  const toYM = sp.to && /^\d{4}-\d{2}$/.test(sp.to) ? sp.to : nowYm
  const fromYM = sp.from && /^\d{4}-\d{2}$/.test(sp.from) ? sp.from : shiftYM(toYM, 5)

  const [rows, summary, receivable, payableTotal, due] = await Promise.all([
    cashflowRange(fromYM, toYM),
    reportSummary(fromYM, toYM),
    receivablesOutstanding(),
    payablesOutstanding(),
    listUpcomingDue(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Báo cáo</h1>

      {/* Chọn kỳ */}
      <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="text-sm text-muted-foreground">Từ tháng
          <input type="month" name="from" defaultValue={fromYM} className={`${inputClass} mt-1 block`} />
        </label>
        <label className="text-sm text-muted-foreground">Đến tháng
          <input type="month" name="to" defaultValue={toYM} className={`${inputClass} mt-1 block`} />
        </label>
        <Button type="submit" variant="outline">Xem</Button>
      </form>

      {/* Thẻ tổng */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng thu" value={formatVND(summary.income)} tone="income" />
        <StatCard label="Tổng chi" value={formatVND(summary.expense)} tone="expense" />
        <StatCard label="Lợi nhuận" value={formatVND(summary.profit)} tone="net" />
        <StatCard label="Dòng tiền ròng" value={formatVND(summary.net)} tone="net" />
      </div>

      {/* Biểu đồ */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-medium text-foreground">Dòng tiền theo tháng</h2>
        <CashflowChart data={rows} />
      </section>

      {/* Công nợ */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">Phải thu</h2>
            <span className="text-sm font-medium text-foreground">{formatVND(receivable.total)}</span>
          </div>
          {receivable.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không còn công nợ phải thu.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {receivable.rows.map((r) => (
                <li key={r.student_id} className="flex justify-between py-2">
                  <Link href={`/tai-chinh/phai-thu?student=${r.student_id}`} className="text-foreground hover:underline">{r.student_name ?? '—'}</Link>
                  <span className="font-medium text-foreground">{formatVND(r.outstanding)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">Phải trả</h2>
            <span className="text-sm font-medium text-foreground">{formatVND(payableTotal)}</span>
          </div>
          <p className="text-sm text-muted-foreground">Chi tiết ở <Link href="/tai-chinh/phai-tra" className="text-primary hover:underline">Phải trả</Link>.</p>
        </section>
      </div>

      {/* Quá hạn */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-destructive">Quá hạn ({due.overdue.length})</h2>
        {due.overdue.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có khoản quá hạn.</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
            {due.overdue.map((r) => (
              <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between px-4 py-3">
                <span>
                  <span className={`mr-2 rounded-full px-2 py-0.5 text-xs ${r.kind === 'receivable' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                    {r.kind === 'receivable' ? 'Thu' : 'Trả'}
                  </span>
                  <Link href={r.kind === 'receivable' ? `/tai-chinh/phai-thu/${r.id}` : `/tai-chinh/phai-tra/${r.id}`} className="text-foreground hover:underline">{r.name ?? '—'}</Link>
                </span>
                <span className="text-right">
                  <span className="font-medium text-foreground">{formatVND(r.remaining)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">Hạn {formatDate(r.due_date)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
