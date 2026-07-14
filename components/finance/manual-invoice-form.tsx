'use client'

import { useActionState } from 'react'
import { createManualInvoice, type FinanceActionState } from '@/server/finance/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'

function Field({ label, name, children }: { label: string; name?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

export default function ManualInvoiceForm({ students }: { students: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState<FinanceActionState, FormData>(createManualInvoice, null)

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Học sinh *" name="studentId">
          <select id="studentId" name="studentId" required defaultValue="" className={selectClass}>
            <option value="">— Chọn học sinh —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Tổng tiền (VND) *" name="totalAmount">
          <Input id="totalAmount" name="totalAmount" inputMode="numeric" required placeholder="vd: 1500000" />
        </Field>
        <Field label="Tiêu đề (tùy chọn)" name="title">
          <Input id="title" name="title" placeholder="vd: Học phí bổ sung" />
        </Field>
        <Field label="Hạn thanh toán" name="dueDate">
          <Input id="dueDate" type="date" name="dueDate" />
        </Field>
      </div>

      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Đang tạo…' : 'Tạo hóa đơn thủ công'}
      </Button>
    </form>
  )
}
