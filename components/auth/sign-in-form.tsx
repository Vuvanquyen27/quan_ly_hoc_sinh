'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signInAction, type AuthState } from '@/server/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SignInForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, null)

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <Input id="email" name="email" type="email" placeholder="ban@email.com" required autoComplete="email" />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">Mật khẩu</label>
          <Link href="/quen-mat-khau" className="text-xs text-[#315c48] hover:underline">Quên mật khẩu?</Link>
        </div>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>

      <Button type="submit" disabled={pending} className="w-full bg-[#315c48] hover:bg-[#244637]">
        {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link href="/dang-ky" className="font-medium text-[#315c48] hover:underline">Đăng ký</Link>
      </p>
    </form>
  )
}
