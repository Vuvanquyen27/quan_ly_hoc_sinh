'use client'

import { useActionState, useState } from 'react'
import { createTransaction, type FinanceLedgerActionState } from '@/server/finance/ledger-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from '@/lib/validators/payment'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'

type Cat = { id: string; name: string; kind: string }

function Field({ label, name, children }: { label: string; name?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

export default function TransactionQuickForm({ categories }: { categories: Cat[] }) {
  const [state, action, pending] = useActionState<FinanceLedgerActionState, FormData>(createTransaction, null)
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const cats = categories.filter((c) => c.kind === type)

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Đã ghi giao dịch.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Loại *" name="type">
          <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as 'income' | 'expense')} className={selectClass}>
            <option value="expense">Chi</option>
            <option value="income">Thu</option>
          </select>
        </Field>
        <Field label="Số tiền (VND) *" name="amount">
          <Input id="amount" name="amount" inputMode="numeric" required placeholder="vd: 150000" />
        </Field>
        <Field label="Danh mục" name="categoryId">
          <select id="categoryId" name="categoryId" className={selectClass} defaultValue="">
            <option value="">— Không phân loại —</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Phương thức" name="method">
          <select id="method" name="method" defaultValue="cash" className={selectClass}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>
            ))}
          </select>
        </Field>
        <Field label="Thời điểm (trống = hiện tại)" name="occurredAt">
          <Input id="occurredAt" type="datetime-local" name="occurredAt" />
        </Field>
        <Field label="Ghi chú" name="note">
          <Input id="note" name="note" placeholder="Diễn giải" />
        </Field>
      </div>
      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Đang ghi…' : 'Ghi giao dịch'}
      </Button>
    </form>
  )
}
