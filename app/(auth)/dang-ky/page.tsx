import type { Metadata } from 'next'
import { SignUpForm } from '@/components/auth/sign-up-form'

export const metadata: Metadata = { title: 'Đăng ký — EduFlow' }

export default function DangKyPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#18211d]">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dùng thử 14 ngày, không cần thẻ thanh toán.</p>
      </div>
      <SignUpForm />
    </>
  )
}
