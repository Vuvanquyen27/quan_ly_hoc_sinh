'use client'

import { useActionState } from 'react'
import { updateAccount, type AccountActionState } from '@/server/admin/accounts-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AccountEditForm({
  userId,
  fullName,
  phone,
  email,
}: {
  userId: string
  fullName: string | null
  phone: string | null
  email: string | null
}) {
  const [state, action, pending] = useActionState<AccountActionState, FormData>(updateAccount, null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Đã lưu thông tin tài khoản.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <Input value={email ?? ''} disabled readOnly />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">Họ tên</label>
          <Input id="fullName" name="fullName" defaultValue={fullName ?? ''} placeholder="Tên giáo viên" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">Số điện thoại</label>
          <Input id="phone" name="phone" defaultValue={phone ?? ''} placeholder="SĐT" />
        </div>
      </div>

      <Button type="submit" variant="outline" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Đang lưu…' : 'Lưu thông tin'}
      </Button>
    </form>
  )
}
