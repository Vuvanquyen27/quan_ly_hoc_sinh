'use client'

import { useActionState } from 'react'
import { updateSettings, type SettingsActionState } from '@/server/settings/actions'
import { CURRENCIES, TIMEZONES, DATE_FORMATS } from '@/lib/validators/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

type S = {
  currency: string
  timezone: string
  date_format: string
  default_session_duration_min: number
  notify_session_reminder: boolean
  notify_payment_due: boolean
}

export default function SettingsForm({ s }: { s: S }) {
  const [state, action, pending] = useActionState<SettingsActionState, FormData>(updateSettings, null)
  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Đã lưu tùy chọn.</p>
      )}
      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Bản này hiển thị cố định theo Việt Nam (VND · dd/MM/yyyy · giờ Hồ Chí Minh). Tùy chọn được lưu cho các bản sau.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="currency" className="text-sm font-medium text-foreground">Tiền tệ</label>
          <select id="currency" name="currency" defaultValue={s.currency} className={selectClass}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="timezone" className="text-sm font-medium text-foreground">Múi giờ</label>
          <select id="timezone" name="timezone" defaultValue={s.timezone} className={selectClass}>
            {TIMEZONES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="dateFormat" className="text-sm font-medium text-foreground">Định dạng ngày</label>
          <select id="dateFormat" name="dateFormat" defaultValue={s.date_format} className={selectClass}>
            {DATE_FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="dur" className="text-sm font-medium text-foreground">Thời lượng buổi mặc định (phút)</label>
          <Input id="dur" name="defaultSessionDurationMin" inputMode="numeric" defaultValue={String(s.default_session_duration_min)} />
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Nhắc nhở</legend>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="notifySessionReminder" defaultChecked={s.notify_session_reminder} className="size-4" /> Nhắc buổi học sắp tới
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="notifyPaymentDue" defaultChecked={s.notify_payment_due} className="size-4" /> Nhắc hạn thanh toán
        </label>
      </fieldset>
      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Đang lưu…' : 'Lưu tùy chọn'}
      </Button>
    </form>
  )
}
