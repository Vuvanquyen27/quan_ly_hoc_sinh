import type { Metadata } from 'next'
import Link from 'next/link'
import { listPayables, payablesTotal } from '@/server/finance/payables'
import { PAYABLE_STATUSES, PAYABLE_STATUS_LABEL } from '@/lib/validators/payable'
import { formatVND, formatDate } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Phải trả — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

type SearchParams = { status?: string; page?: string }

function isOverdue(p: { due_date: string | null; status: string }, today: string): boolean {
  if (!p.due_date) return false
  if (p.status === 'paid' || p.status === 'cancelled') return false
  return p.due_date < today
}

export default async function PhaiTraPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const today = new Date().toISOString().slice(0, 10)

  const [{ rows, total, pageSize }, totalOutstanding] = await Promise.all([
    listPayables({ status: sp.status, page }),
    payablesTotal(),
  ])
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (sp.status) params.set('status', sp.status)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/tai-chinh/phai-tra?${qs}` : '/tai-chinh/phai-tra'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Phải trả</h1>
        <Link href="/tai-chinh/phai-tra/moi" className={buttonVariants({ variant: 'success', className: 'w-full sm:w-auto' })}>
          + Thêm khoản phải trả
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Tổng công nợ phải trả</p>
        <p className="mt-1 text-3xl font-semibold text-foreground">{formatVND(totalOutstanding)}</p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select name="status" defaultValue={sp.status ?? ''} className={inputClass}>
          <option value="">Tất cả trạng thái</option>
          {PAYABLE_STATUSES.map((s) => (
            <option key={s} value={s}>{PAYABLE_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">Lọc</Button>
      </form>

      <p className="text-sm text-muted-foreground">{total} khoản</p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Chưa có khoản phải trả nào.</p>
          <Link href="/tai-chinh/phai-tra/moi" className={buttonVariants({ variant: 'success', className: 'mt-4' })}>
            Thêm khoản đầu tiên
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Chủ nợ / Nội dung</th>
                  <th className="px-4 py-3">Danh mục</th>
                  <th className="px-4 py-3">Hạn</th>
                  <th className="px-4 py-3 text-right">Tổng</th>
                  <th className="px-4 py-3 text-right">Còn nợ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const overdue = isOverdue(p, today)
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted">
                      <td className="px-4 py-3">
                        <Link href={`/tai-chinh/phai-tra/${p.id}`} className="font-medium text-foreground hover:underline">
                          {p.creditor_name ?? '—'}
                        </Link>
                        {p.title && <div className="text-xs text-muted-foreground">{p.title}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.category_name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.due_date ? formatDate(p.due_date) : '—'}
                        {overdue && <span className="ml-1 text-xs text-destructive">(quá hạn)</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">{formatVND(p.total_amount)}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{formatVND(p.total_amount - p.amount_paid)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                          {PAYABLE_STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {rows.map((p) => {
              const overdue = isOverdue(p, today)
              return (
                <li key={p.id}>
                  <Link href={`/tai-chinh/phai-tra/${p.id}`} className="block rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-foreground">{p.creditor_name ?? '—'}</span>
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                        {PAYABLE_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                    {p.title && <p className="mt-0.5 text-xs text-muted-foreground">{p.title}</p>}
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <div><dt className="inline">Tổng: </dt><dd className="inline">{formatVND(p.total_amount)}</dd></div>
                      <div><dt className="inline">Còn nợ: </dt><dd className="inline font-medium text-foreground">{formatVND(p.total_amount - p.amount_paid)}</dd></div>
                      {p.due_date && (
                        <div className={overdue ? 'text-destructive' : ''}>
                          <dt className="inline">Hạn: </dt><dd className="inline">{formatDate(p.due_date)}{overdue ? ' (quá hạn)' : ''}</dd>
                        </div>
                      )}
                    </dl>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Trang {page}/{totalPages}</span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={buildHref(page - 1)} className={buttonVariants({ variant: 'outline' })}>← Trước</Link>
            ) : (
              <Button variant="outline" disabled>← Trước</Button>
            )}
            {page < totalPages ? (
              <Link href={buildHref(page + 1)} className={buttonVariants({ variant: 'outline' })}>Sau →</Link>
            ) : (
              <Button variant="outline" disabled>Sau →</Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
