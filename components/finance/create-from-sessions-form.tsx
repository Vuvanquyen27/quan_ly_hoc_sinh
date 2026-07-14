'use client'

import { useActionState } from 'react'
import { createInvoiceFromSessions, type FinanceActionState } from '@/server/finance/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatVND } from '@/lib/format'

function Field({ label, name, children }: { label: string; name?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

export default function CreateFromSessionsForm({
  studentId,
  periodMonth,
  subtotal,
}: {
  studentId: string
  periodMonth: string
  subtotal: number
}) {
  const [state, action, pending] = useActionState<FinanceActionState, FormData>(createInvoiceFromSessions, null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="periodMonth" value={periodMonth} />
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Giảm giá (VND)" name="discount">
          <Input id="discount" name="discount" inputMode="numeric" defaultValue="0" />
        </Field>
        <Field label="Hạn thanh toán" name="dueDate">
          <Input id="dueDate" type="date" name="dueDate" />
        </Field>
      </div>
      <Field label="Tiêu đề (tùy chọn)" name="title">
        <Input id="title" name="title" placeholder="vd: Học phí tháng 07/2026" />
      </Field>

      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Đang tạo…' : `Tạo hóa đơn — ${formatVND(subtotal)}`}
      </Button>
    </form>
  )
}
