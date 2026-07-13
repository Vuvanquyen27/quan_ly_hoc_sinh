'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUpAction, type AuthState } from '@/server/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, null)

  if (state?.message) {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-md bg-success/10 px-3 py-3 text-sm text-success">{state.message}</p>
        <Link href="/dang-nhap" className="inline-block font-medium text-primary hover:underline">
          Tới trang đăng nhập
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="fullName" className="text-sm font-medium">Họ và tên</label>
        <Input id="fullName" name="fullName" type="text" placeholder="Nguyễn Văn A" required autoComplete="name" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <Input id="email" name="email" type="email" placeholder="ban@email.com" required autoComplete="email" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">Mật khẩu</label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        <p className="text-xs text-muted-foreground">Ít nhất 8 ký tự.</p>
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Đang tạo tài khoản…' : 'Bắt đầu dùng thử 14 ngày'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link href="/dang-nhap" className="font-medium text-primary hover:underline">Đăng nhập</Link>
      </p>
    </form>
  )
}
