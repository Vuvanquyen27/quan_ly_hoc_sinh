import type { Metadata } from 'next'
import { ResetForm } from '@/components/auth/reset-form'

export const metadata: Metadata = { title: 'Quên mật khẩu — EduFlow' }

export default function QuenMatKhauPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#18211d]">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nhập email để nhận liên kết đặt lại mật khẩu.</p>
      </div>
      <ResetForm />
    </>
  )
}
