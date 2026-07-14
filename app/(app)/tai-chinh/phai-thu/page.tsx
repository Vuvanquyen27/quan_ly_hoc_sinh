import type { Metadata } from 'next'
import Link from 'next/link'
import { listInvoices, receivablesByStudent } from '@/server/finance/queries'
import { listStudents } from '@/server/students/queries'
import { INVOICE_STATUSES, INVOICE_STATUS_LABEL } from '@/lib/validators/invoice'
import { formatVND, formatDate } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Phải thu — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

type SearchParams = { status?: string; student?: string; page?: string }

/** Hóa đơn quá hạn: có hạn, đã qua hôm nay, chưa thu đủ/hủy. */
function isOverdue(inv: { due_date: string | null; status: string }, today: string): boolean {
  if (!inv.due_date) return false
  if (inv.status === 'paid' || inv.status === 'cancelled') return false
  return inv.due_date < today
}

export default async function PhaiThuPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const today = new Date().toISOString().slice(0, 10)

  const [{ rows, total, pageSize }, students, byStudent] = await Promise.all([
    listInvoices({ status: sp.status, studentId: sp.student, page }),
    listStudents({ page: 1 }),
    receivablesByStudent(),
  ])
  const totalOutstanding = byStudent.reduce((s, r) => s + r.outstanding, 0)
  const debtors = byStudent.filter((r) => r.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (sp.status) params.set('status', sp.status)
    if (sp.student) params.set('student', sp.student)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/tai-chinh/phai-thu?${qs}` : '/tai-chinh/phai-thu'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Phải thu</h1>
        <Link
          href="/tai-chinh/phai-thu/moi"
          className={buttonVariants({ variant: 'success', className: 'w-full sm:w-auto' })}
        >
          + Tạo hóa đơn
        </Link>
      </div>

      {/* Tổng công nợ */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Tổng công nợ phải thu</p>
        <p className="mt-1 text-3xl font-semibold text-foreground">{formatVND(totalOutstanding)}</p>
        {debtors.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {debtors.slice(0, 8).map((d) => (
              <li key={d.studentId}>
                <Link
                  href={`/tai-chinh/phai-thu?student=${d.studentId}`}
                  className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground hover:opacity-80"
                >
                  {d.studentName ?? 'Học sinh'} · {formatVND(d.outstanding)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Lọc */}
      <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select name="student" defaultValue={sp.student ?? ''} className={inputClass}>
          <option value="">Tất cả học sinh</option>
          {students.rows.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? ''} className={inputClass}>
          <option value="">Tất cả trạng thái</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>{INVOICE_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">Lọc</Button>
      </form>

      <p className="text-sm text-muted-foreground">{total} hóa đơn</p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Chưa có hóa đơn nào.</p>
          <Link
            href="/tai-chinh/phai-thu/moi"
            className={buttonVariants({ variant: 'success', className: 'mt-4' })}
          >
            Tạo hóa đơn đầu tiên
          </Link>
        </div>
      ) : (
        <>
          {/* Bảng — từ md */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Học sinh</th>
                  <th className="px-4 py-3">Kỳ / Hạn</th>
                  <th className="px-4 py-3 text-right">Tổng</th>
                  <th className="px-4 py-3 text-right">Còn nợ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => {
                  const overdue = isOverdue(inv, today)
                  return (
                    <tr key={inv.id} className="border-t border-border hover:bg-muted">
                      <td className="px-4 py-3">
                        <Link href={`/tai-chinh/phai-thu/${inv.id}`} className="font-medium text-foreground hover:underline">
                          {inv.student_name ?? '—'}
                        </Link>
                        {inv.title && <div className="text-xs text-muted-foreground">{inv.title}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {inv.period_month ? formatDate(inv.period_month) : '—'}
                        {inv.due_date && <div className="text-xs">Hạn: {formatDate(inv.due_date)}</div>}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">{formatVND(inv.total_amount)}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {formatVND(inv.total_amount - inv.amount_paid)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                          {INVOICE_STATUS_LABEL[inv.status] ?? inv.status}
                        </span>
                        {overdue && (
                          <span className="ml-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs text-destructive">
                            Quá hạn
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Card — dưới md */}
          <ul className="space-y-3 md:hidden">
            {rows.map((inv) => {
              const overdue = isOverdue(inv, today)
              return (
                <li key={inv.id}>
                  <Link href={`/tai-chinh/phai-thu/${inv.id}`} className="block rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-foreground">{inv.student_name ?? '—'}</span>
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                        {INVOICE_STATUS_LABEL[inv.status] ?? inv.status}
                      </span>
                    </div>
                    {inv.title && <p className="mt-0.5 text-xs text-muted-foreground">{inv.title}</p>}
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <div><dt className="inline">Tổng: </dt><dd className="inline">{formatVND(inv.total_amount)}</dd></div>
                      <div><dt className="inline">Còn nợ: </dt><dd className="inline font-medium text-foreground">{formatVND(inv.total_amount - inv.amount_paid)}</dd></div>
                      {inv.due_date && (
                        <div className={overdue ? 'text-destructive' : ''}>
                          <dt className="inline">Hạn: </dt><dd className="inline">{formatDate(inv.due_date)}{overdue ? ' (quá hạn)' : ''}</dd>
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
