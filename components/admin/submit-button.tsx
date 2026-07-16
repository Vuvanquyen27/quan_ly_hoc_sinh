'use client'

import type { ComponentProps } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

/**
 * Nút submit tự vô hiệu khi form đang gửi (useFormStatus) — chặn double-click gây
 * chạy server action 2 lần (tránh nhân đôi dòng admin_audit_logs). Dùng cho các
 * <form action={voidAction}> không qua useActionState.
 */
export function SubmitButton({
  children,
  pendingText = 'Đang xử lý…',
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" {...props} disabled={pending || props.disabled}>
      {pending ? pendingText : children}
    </Button>
  )
}
