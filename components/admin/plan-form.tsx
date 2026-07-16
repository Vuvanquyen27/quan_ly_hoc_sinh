'use client'

import { useActionState } from 'react'
import { createPlan, updatePlan, type PlanActionState } from '@/server/admin/plans-actions'
import { BILLING_CYCLES, BILLING_CYCLE_LABEL } from '@/lib/validators/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'

type Defaults = {
  code?: string
  name?: string
  description?: string | null
  price?: number
  billing_cycle?: string
  is_active?: boolean
  sort_order?: number
}

function Field({ label, name, children }: { label: string; name?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

export default function PlanForm({ planId, defaults }: { planId?: string; defaults?: Defaults }) {
  const [state, action, pending] = useActionState<PlanActionState, FormData>(
    planId ? updatePlan : createPlan,
    null,
  )

  return (
    <form action={action} className="space-y-4">
      {planId && <input type="hidden" name="id" value={planId} />}
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mã gói * (chữ thường, số, gạch dưới)" name="code">
          <Input id="code" name="code" required defaultValue={defaults?.code ?? ''} placeholder="vd: pro_monthly" />
        </Field>
        <Field label="Tên gói *" name="name">
          <Input id="name" name="name" required defaultValue={defaults?.name ?? ''} placeholder="vd: Gói Pro (tháng)" />
        </Field>
        <Field label="Giá (VND) *" name="price">
          <Input id="price" name="price" inputMode="numeric" required defaultValue={defaults?.price != null ? String(defaults.price) : ''} placeholder="vd: 99000" />
        </Field>
        <Field label="Chu kỳ *" name="billingCycle">
          <select id="billingCycle" name="billingCycle" defaultValue={defaults?.billing_cycle ?? 'monthly'} className={selectClass}>
            {BILLING_CYCLES.map((c) => (
              <option key={c} value={c}>{BILLING_CYCLE_LABEL[c]}</option>
            ))}
          </select>
        </Field>
        <Field label="Thứ tự hiển thị" name="sortOrder">
          <Input id="sortOrder" name="sortOrder" inputMode="numeric" defaultValue={defaults?.sort_order != null ? String(defaults.sort_order) : '0'} />
        </Field>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input type="checkbox" name="isActive" defaultChecked={defaults?.is_active ?? true} className="size-4 rounded border-input" />
            Đang mở bán
          </label>
        </div>
      </div>
      <Field label="Mô tả" name="description">
        <Input id="description" name="description" defaultValue={defaults?.description ?? ''} placeholder="Mô tả ngắn về gói" />
      </Field>

      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Đang lưu…' : planId ? 'Lưu thay đổi' : 'Tạo gói'}
      </Button>
    </form>
  )
}
