'use client'

import { useActionState, useState } from 'react'
import {
  confirmPaymentAndActivate,
  renewSubscription,
  changePlan,
  cancelSubscription,
  type SubscriptionActionState,
} from '@/server/admin/subscriptions-actions'
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  BILLING_CYCLE_LABEL,
} from '@/lib/validators/admin'
import { formatVND } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'

type PanelPlan = {
  id: string
  code: string
  name: string
  price: number
  billing_cycle: string
  is_active: boolean
}

function planLabel(p: PanelPlan): string {
  const cycle = BILLING_CYCLE_LABEL[p.billing_cycle] ?? p.billing_cycle
  return `${p.name} — ${formatVND(p.price)} / ${cycle}${p.is_active ? '' : ' (ngưng bán)'}`
}

function MethodSelect() {
  return (
    <select name="method" defaultValue="bank_transfer" className={selectClass}>
      {PAYMENT_METHODS.map((m) => (
        <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>
      ))}
    </select>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

export default function SubscriptionPanel({
  userId,
  status,
  currentPlanId,
  plans,
  defaultDate,
}: {
  userId: string
  status: string
  currentPlanId: string | null
  plans: PanelPlan[]
  defaultDate: string
}) {
  const initial = currentPlanId ?? plans[0]?.id ?? ''
  const priceOf = (id: string) => plans.find((p) => p.id === id)?.price ?? 0

  const [actPlan, setActPlan] = useState(initial)
  const [actAmount, setActAmount] = useState(initial ? String(priceOf(initial)) : '')
  const [renPlan, setRenPlan] = useState(initial)
  const [renAmount, setRenAmount] = useState(initial ? String(priceOf(initial)) : '')

  const [actState, actAction, actPending] = useActionState<SubscriptionActionState, FormData>(
    confirmPaymentAndActivate,
    null,
  )
  const [renState, renAction, renPending] = useActionState<SubscriptionActionState, FormData>(
    renewSubscription,
    null,
  )

  if (plans.length === 0) {
    return (
      <p className="rounded-md bg-warning/15 px-3 py-2 text-sm text-foreground">
        Chưa có gói nào. Hãy tạo gói ở mục <span className="font-medium">Gói</span> trước khi kích hoạt thuê bao.
      </p>
    )
  }

  const isCancelled = status === 'cancelled'

  return (
    <div className="space-y-5">
      {/* Kích hoạt / xác nhận thanh toán */}
      <div className="rounded-xl border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Xác nhận thanh toán & kích hoạt</h3>
        <form action={actAction} className="space-y-3">
          <input type="hidden" name="userId" value={userId} />
          {actState?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actState.error}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Gói">
              <select
                name="planId"
                value={actPlan}
                onChange={(e) => {
                  setActPlan(e.target.value)
                  setActAmount(String(priceOf(e.target.value)))
                }}
                className={selectClass}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{planLabel(p)}</option>
                ))}
              </select>
            </Field>
            <Field label="Phương thức">
              <MethodSelect />
            </Field>
            <Field label="Số tiền (VND)">
              <Input name="amount" inputMode="numeric" value={actAmount} onChange={(e) => setActAmount(e.target.value)} />
            </Field>
            <Field label="Ngày bắt đầu">
              <Input type="date" name="periodStart" defaultValue={defaultDate} />
            </Field>
            <Field label="Mã tham chiếu">
              <Input name="reference" placeholder="Số CT chuyển khoản…" />
            </Field>
            <Field label="Ghi chú">
              <Input name="note" />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Ngày hết hạn tự tính theo chu kỳ của gói kể từ ngày bắt đầu.
          </p>
          <Button type="submit" variant="success" disabled={actPending} className="w-full sm:w-auto">
            {actPending ? 'Đang xử lý…' : 'Xác nhận & kích hoạt'}
          </Button>
        </form>
      </div>

      {/* Gia hạn */}
      <div className="rounded-xl border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Gia hạn</h3>
        <form action={renAction} className="space-y-3">
          <input type="hidden" name="userId" value={userId} />
          {renState?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{renState.error}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Gói">
              <select
                name="planId"
                value={renPlan}
                onChange={(e) => {
                  setRenPlan(e.target.value)
                  setRenAmount(String(priceOf(e.target.value)))
                }}
                className={selectClass}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{planLabel(p)}</option>
                ))}
              </select>
            </Field>
            <Field label="Phương thức">
              <MethodSelect />
            </Field>
            <Field label="Số tiền (VND)">
              <Input name="amount" inputMode="numeric" value={renAmount} onChange={(e) => setRenAmount(e.target.value)} />
            </Field>
            <Field label="Mã tham chiếu">
              <Input name="reference" placeholder="Số CT chuyển khoản…" />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Đẩy hạn thêm một chu kỳ từ ngày hết hạn hiện tại (nếu còn hạn) hoặc từ hôm nay.
          </p>
          <Button type="submit" variant="outline" disabled={renPending} className="w-full sm:w-auto">
            {renPending ? 'Đang xử lý…' : 'Gia hạn'}
          </Button>
        </form>
      </div>

      {/* Đổi gói + Hủy */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Đổi gói (không thu tiền)</h3>
          <form action={changePlan} className="flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="userId" value={userId} />
            <select name="planId" defaultValue={initial} className={selectClass}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{planLabel(p)}</option>
              ))}
            </select>
            <Button type="submit" variant="outline" className="shrink-0">Đổi gói</Button>
          </form>
        </div>

        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Hủy thuê bao</h3>
          <form
            action={cancelSubscription}
            onSubmit={(e) => {
              if (!confirm('Hủy thuê bao của tài khoản này?')) e.preventDefault()
            }}
          >
            <input type="hidden" name="userId" value={userId} />
            <Button type="submit" variant="destructive" disabled={isCancelled}>
              {isCancelled ? 'Đã hủy' : 'Hủy thuê bao'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
