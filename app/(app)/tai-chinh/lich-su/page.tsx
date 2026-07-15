import type { Metadata } from 'next'
import Link from 'next/link'
import { listTransactions } from '@/server/finance/ledger'
import { PAYMENT_METHOD_LABEL } from '@/lib/validators/payment'
import { formatVND, formatDateTime } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Lịch sử thanh toán — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
const SOURCE_LABEL: Record<string, string> = { invoice: 'Học phí', payable: 'Trả nợ', free: 'Tự do' }

type SearchParams = { type?: string; from?: string; to?: string; page?: string }

export default async function LichSuPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const { rows, total, pageSize } = await listTransactions({ type: sp.type, from: sp.from, to: sp.to, page })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries({ type: sp.type, from: sp.from, to: sp.to })) if (v) params.set(k, v)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/tai-chinh/lich-su?${qs}` : '/tai-chinh/lich-su'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Lịch sử thanh toán</h1>

      <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <select name="type" defaultValue={sp.type ?? ''} className={inputClass}>
          <option value="">Tất cả loại</option>
          <option value="income">Thu</option>
          <option value="expense">Chi</option>
        </select>
        <input type="date" name="from" defaultValue={sp.from ?? ''} className={inputClass} />
        <input type="date" name="to" defaultValue={sp.to ?? ''} className={inputClass} />
        <Button type="submit" variant="outline">Lọc</Button>
      </form>

      <p className="text-sm text-muted-foreground">{total} giao dịch</p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Chưa có giao dịch nào.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <span className={`font-medium ${t.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                  {t.type === 'income' ? '+' : '−'}{formatVND(t.amount)}
                </span>
                <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{SOURCE_LABEL[t.source]}</span>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {[t.category_name, t.student_name, t.creditor_name, t.note].filter(Boolean).join(' · ') || '—'}
                  {' · '}{PAYMENT_METHOD_LABEL[t.method] ?? t.method}
                </div>
              </div>
              <span className="shrink-0 text-muted-foreground">{formatDateTime(t.occurred_at)}</span>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Trang {page}/{totalPages}</span>
          <div className="flex items-center gap-2">
            {page > 1 ? <Link href={buildHref(page - 1)} className={buttonVariants({ variant: 'outline' })}>← Trước</Link> : <Button variant="outline" disabled>← Trước</Button>}
            {page < totalPages ? <Link href={buildHref(page + 1)} className={buttonVariants({ variant: 'outline' })}>Sau →</Link> : <Button variant="outline" disabled>Sau →</Button>}
          </div>
        </div>
      )}
    </div>
  )
}
