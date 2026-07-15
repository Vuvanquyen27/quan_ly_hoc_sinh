import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayable } from '@/server/finance/payables'
import { cancelPayableAction } from '@/server/finance/payables-actions'
import { PAYABLE_STATUS_LABEL } from '@/lib/validators/payable'
import { PAYMENT_METHOD_LABEL } from '@/lib/validators/payment'
import { formatVND, formatDate, formatDateTime } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'
import PayablePaymentForm from '@/components/finance/payable-payment-form'

export const metadata: Metadata = { title: 'Chi tiết phải trả — EduFlow' }

export default async function PhaiTraChiTietPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getPayable(id)
  if (!data) notFound()
  const { payable: p, transactions } = data
  const remaining = p.total_amount - p.amount_paid
  const closed = p.status === 'paid' || p.status === 'cancelled'
  const today = new Date().toISOString().slice(0, 10)
  const overdue = !!p.due_date && !closed && p.due_date < today

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/tai-chinh/phai-tra" className="text-sm text-muted-foreground hover:text-foreground">← Phải trả</Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{p.creditor_name ?? 'Khoản phải trả'}</h1>
          {p.title && <p className="text-muted-foreground">{p.title}</p>}
        </div>
        {p.status !== 'cancelled' && (
          <div className="flex gap-2">
            <Link href={`/tai-chinh/phai-tra/${p.id}/sua`} className={buttonVariants({ variant: 'outline' })}>Sửa</Link>
            <form action={cancelPayableAction}>
              <input type="hidden" name="id" value={p.id} />
              <Button type="submit" variant="outline" className="text-destructive">Hủy khoản</Button>
            </form>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Summary label="Tổng phải trả" value={formatVND(p.total_amount)} />
        <Summary label="Đã trả" value={formatVND(p.amount_paid)} />
        <Summary label="Còn nợ" value={formatVND(remaining)} strong />
        <Summary
          label="Trạng thái"
          value={(PAYABLE_STATUS_LABEL[p.status] ?? p.status) + (overdue ? ' · quá hạn' : '')}
        />
      </div>
      {p.due_date && <p className="text-sm text-muted-foreground">Hạn trả: {formatDate(p.due_date)}</p>}

      {!closed && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-medium text-foreground">Ghi trả nợ</h2>
          <PayablePaymentForm payableId={p.id} remaining={remaining} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">Lịch sử trả</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có giao dịch nào.</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-medium text-foreground">{formatVND(t.amount)}</span>
                  <span className="ml-2 text-muted-foreground">{PAYMENT_METHOD_LABEL[t.method] ?? t.method}</span>
                  {t.reference && <span className="ml-2 text-xs text-muted-foreground">#{t.reference}</span>}
                </div>
                <span className="text-muted-foreground">{formatDateTime(t.occurred_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Summary({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 ${strong ? 'text-xl font-semibold' : 'text-base'} text-foreground`}>{value}</p>
    </div>
  )
}
