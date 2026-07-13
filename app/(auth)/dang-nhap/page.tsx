import type { Metadata } from 'next'
import { SignInForm } from '@/components/auth/sign-in-form'

export const metadata: Metadata = { title: 'Đăng nhập — EduFlow' }

export default function DangNhapPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#18211d]">Đăng nhập</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chào mừng trở lại không gian làm việc của bạn.</p>
      </div>
      <SignInForm />
    </>
  )
}
