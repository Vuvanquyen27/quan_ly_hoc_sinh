'use client'

import { useActionState } from 'react'
import { updateProfile, type SettingsActionState } from '@/server/settings/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ProfileForm({
  fullName,
  phone,
  email,
}: {
  fullName: string | null
  phone: string | null
  email: string | null
}) {
  const [state, action, pending] = useActionState<SettingsActionState, FormData>(updateProfile, null)
  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Đã lưu hồ sơ.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">Tên hiển thị</label>
          <Input id="fullName" name="fullName" defaultValue={fullName ?? ''} placeholder="vd: Cô Lan" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">Số điện thoại</label>
          <Input id="phone" name="phone" defaultValue={phone ?? ''} placeholder="vd: 0901234567" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <Input value={email ?? ''} disabled readOnly />
        </div>
      </div>
      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Đang lưu…' : 'Lưu hồ sơ'}
      </Button>
    </form>
  )
}
