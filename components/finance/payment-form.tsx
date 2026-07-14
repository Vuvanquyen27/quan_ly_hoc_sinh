'use client'

import { useActionState } from 'react'
import { recordTuitionPayment, type FinanceActionState } from '@/server/finance/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from '@/lib/validators/payment'

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

export default function PaymentForm({ invoiceId, remaining }: { invoiceId: string; remaining: number }) {
  const [state, action, pending] = useActionState<FinanceActionState, FormData>(recordTuitionPayment, null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Số tiền (VND) *" name="amount">
          <Input
            id="amount" name="amount" inputMode="numeric" required
            defaultValue={remaining > 0 ? String(remaining) : ''}
            placeholder="Số tiền thu"
          />
        </Field>
        <Field label="Phương thức" name="method">
          <select id="method" name="method" defaultValue="cash" className={selectClass}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>
            ))}
          </select>
        </Field>
        <Field label="Ngày thu (để trống = hiện tại)" name="occurredAt">
          <Input id="occurredAt" type="datetime-local" name="occurredAt" />
        </Field>
        <Field label="Tham chiếu (số CT…)" name="reference">
          <Input id="reference" name="reference" placeholder="vd: MB123456" />
        </Field>
      </div>

      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Đang ghi…' : 'Ghi thanh toán'}
      </Button>
    </form>
  )
}
