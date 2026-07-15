'use client'

import { useActionState } from 'react'
import { createPayable, updatePayable, type FinancePayableActionState } from '@/server/finance/payables-actions'
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

type Cat = { id: string; name: string }
type Defaults = {
  creditorName?: string | null
  title?: string | null
  categoryId?: string | null
  totalAmount?: number
  dueDate?: string | null
  note?: string | null
}

export default function PayableForm({
  categories,
  payableId,
  defaults,
}: {
  categories: Cat[]
  payableId?: string
  defaults?: Defaults
}) {
  const [state, action, pending] = useActionState<FinancePayableActionState, FormData>(
    payableId ? updatePayable : createPayable,
    null,
  )

  return (
    <form action={action} className="space-y-4">
      {payableId && <input type="hidden" name="id" value={payableId} />}
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Chủ nợ" name="creditorName">
          <Input id="creditorName" name="creditorName" defaultValue={defaults?.creditorName ?? ''} placeholder="vd: Chủ nhà, Nhà sách…" />
        </Field>
        <Field label="Danh mục (chi)" name="categoryId">
          <select id="categoryId" name="categoryId" defaultValue={defaults?.categoryId ?? ''} className={selectClass}>
            <option value="">— Không phân loại —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Nội dung" name="title">
          <Input id="title" name="title" defaultValue={defaults?.title ?? ''} placeholder="vd: Thuê phòng tháng 7" />
        </Field>
        <Field label="Tổng phải trả (VND) *" name="totalAmount">
          <Input id="totalAmount" name="totalAmount" inputMode="numeric" required defaultValue={defaults?.totalAmount ? String(defaults.totalAmount) : ''} placeholder="vd: 2000000" />
        </Field>
        <Field label="Hạn trả" name="dueDate">
          <Input id="dueDate" type="date" name="dueDate" defaultValue={defaults?.dueDate ?? ''} />
        </Field>
      </div>
      <Field label="Ghi chú" name="note">
        <Input id="note" name="note" defaultValue={defaults?.note ?? ''} />
      </Field>

      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Đang lưu…' : payableId ? 'Lưu thay đổi' : 'Tạo khoản phải trả'}
      </Button>
    </form>
  )
}
