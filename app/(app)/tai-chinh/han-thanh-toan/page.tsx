import type { Metadata } from 'next'
import Link from 'next/link'
import { listUpcomingDue, type DueRow } from '@/server/finance/ledger'
import { formatVND, formatDate } from '@/lib/format'

export const metadata: Metadata = { title: 'Hạn thanh toán — EduFlow' }

function DueList({ title, rows, tone }: { title: string; rows: DueRow[]; tone: 'danger' | 'normal' }) {
  return (
    <section className="space-y-3">
      <h2 className={`text-lg font-medium ${tone === 'danger' ? 'text-destructive' : 'text-foreground'}`}>
        {title} <span className="text-sm text-muted-foreground">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có khoản nào.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.map((r) => (
            <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <span className={`rounded-full px-2 py-0.5 text-xs ${r.kind === 'receivable' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                  {r.kind === 'receivable' ? 'Thu' : 'Trả'}
                </span>
                <Link
                  href={r.kind === 'receivable' ? `/tai-chinh/phai-thu/${r.id}` : `/tai-chinh/phai-tra/${r.id}`}
                  className="ml-2 font-medium text-foreground hover:underline"
                >
                  {r.name ?? '—'}
                </Link>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-medium text-foreground">{formatVND(r.remaining)}</div>
                <div className="text-xs text-muted-foreground">Hạn {formatDate(r.due_date)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default async function HanThanhToanPage() {
  const { overdue, upcoming } = await listUpcomingDue()
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Hạn thanh toán</h1>
      <DueList title="Quá hạn" rows={overdue} tone="danger" />
      <DueList title="Sắp tới" rows={upcoming} tone="normal" />
    </div>
  )
}
