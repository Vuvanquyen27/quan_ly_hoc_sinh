import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getInvoice } from '@/server/finance/queries'
import { cancelInvoiceAction } from '@/server/finance/actions'
import { INVOICE_STATUS_LABEL } from '@/lib/validators/invoice'
import { PAYMENT_METHOD_LABEL } from '@/lib/validators/payment'
import { formatVND, formatDate, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import PaymentForm from '@/components/finance/payment-form'

export const metadata: Metadata = { title: 'Chi tiết hóa đơn — EduFlow' }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-b-0 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words text-foreground sm:text-right">{value}</span>
    </div>
  )
}

export default async function ChiTietHoaDonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getInvoice(id)
  if (!data) notFound()

  const { invoice, items, transactions } = data
  const remaining = invoice.total_amount - invoice.amount_paid
  const isCancelled = invoice.status === 'cancelled'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/tai-chinh/phai-thu" className="text-sm text-primary hover:underline">← Danh sách hóa đơn</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{invoice.student_name ?? 'Hóa đơn'}</h1>
            {invoice.title && <p className="text-sm text-muted-foreground">{invoice.title}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {INVOICE_STATUS_LABEL[invoice.status] ?? invoice.status}
            </span>
            {!isCancelled && (
              <form action={cancelInvoiceAction}>
                <input type="hidden" name="id" value={invoice.id} />
                <Button type="submit" variant="outline" size="sm">Hủy hóa đơn</Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Tổng quan số tiền */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Tổng</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{formatVND(invoice.total_amount)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Đã thu</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{formatVND(invoice.amount_paid)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Còn nợ</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{formatVND(remaining)}</p>
        </div>
      </div>

      {/* Thông tin hóa đơn */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <Row label="Kỳ" value={invoice.period_month ? formatDate(invoice.period_month) : '—'} />
        <Row label="Ngày lập" value={invoice.issue_date ? formatDate(invoice.issue_date) : '—'} />
        <Row label="Hạn thanh toán" value={invoice.due_date ? formatDate(invoice.due_date) : '—'} />
        {invoice.discount > 0 && <Row label="Giảm giá" value={formatVND(invoice.discount)} />}
        {invoice.note && <Row label="Ghi chú" value={invoice.note} />}
      </div>

      {/* Dòng chi tiết */}
      {items.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Chi tiết ({items.length} dòng)</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-foreground">{it.description ?? 'Khoản mục'}</span>
                <span className="text-sm font-medium text-foreground">{formatVND(it.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ghi thanh toán */}
      {!isCancelled && remaining > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Ghi thanh toán</h2>
          <div className="rounded-2xl border border-border bg-card p-6">
            <PaymentForm invoiceId={invoice.id} remaining={remaining} />
          </div>
        </section>
      )}
      {!isCancelled && remaining <= 0 && invoice.total_amount > 0 && (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">✓ Hóa đơn đã thu đủ.</p>
      )}

      {/* Lịch sử thanh toán */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Lịch sử thanh toán</h2>
        {transactions.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Chưa có giao dịch.</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{formatVND(t.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(t.occurred_at)} · {PAYMENT_METHOD_LABEL[t.method] ?? t.method}
                    {t.reference ? ` · ${t.reference}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
