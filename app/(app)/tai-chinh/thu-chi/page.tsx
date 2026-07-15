import type { Metadata } from 'next'
import Link from 'next/link'
import { listTransactions } from '@/server/finance/ledger'
import { deleteTransactionAction } from '@/server/finance/ledger-actions'
import { listCategories } from '@/server/finance/categories'
import { PAYMENT_METHOD_LABEL } from '@/lib/validators/payment'
import { formatVND, formatDateTime } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'
import TransactionQuickForm from '@/components/finance/transaction-quick-form'

export const metadata: Metadata = { title: 'Sổ thu/chi — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

type SearchParams = { type?: string; category?: string; from?: string; to?: string; page?: string }

const SOURCE_LABEL: Record<string, string> = { invoice: 'Học phí', payable: 'Trả nợ', free: 'Tự do' }

export default async function ThuChiPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const [{ rows, total, pageSize }, categories] = await Promise.all([
    listTransactions({ type: sp.type, categoryId: sp.category, from: sp.from, to: sp.to, page }),
    listCategories(),
  ])
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries({ type: sp.type, category: sp.category, from: sp.from, to: sp.to })) {
      if (v) params.set(k, v)
    }
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/tai-chinh/thu-chi?${qs}` : '/tai-chinh/thu-chi'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sổ thu/chi</h1>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-medium text-foreground">Ghi nhanh</h2>
        <TransactionQuickForm categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))} />
      </section>

      <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <select name="type" defaultValue={sp.type ?? ''} className={inputClass}>
          <option value="">Tất cả loại</option>
          <option value="income">Thu</option>
          <option value="expense">Chi</option>
        </select>
        <select name="category" defaultValue={sp.category ?? ''} className={inputClass}>
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
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
                <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  {SOURCE_LABEL[t.source]}
                </span>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {[t.category_name, t.student_name, t.creditor_name, t.note].filter(Boolean).join(' · ') || '—'}
                  {' · '}{PAYMENT_METHOD_LABEL[t.method] ?? t.method}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-muted-foreground">{formatDateTime(t.occurred_at)}</span>
                {t.source === 'free' && (
                  <form action={deleteTransactionAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button type="submit" variant="ghost" className="h-8 px-2 text-xs text-destructive">Xóa</Button>
                  </form>
                )}
              </div>
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
