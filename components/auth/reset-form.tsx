'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { resetPasswordAction, type AuthState } from '@/server/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ResetForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPasswordAction, null)

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      {state?.message && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{state.message}</p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <Input id="email" name="email" type="email" placeholder="ban@email.com" required autoComplete="email" />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/dang-nhap" className="font-medium text-primary hover:underline">Quay lại đăng nhập</Link>
      </p>
    </form>
  )
}
