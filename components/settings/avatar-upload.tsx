'use client'

import { useActionState } from 'react'
import { uploadAvatar, type SettingsActionState } from '@/server/settings/actions'
import { Button } from '@/components/ui/button'

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="%23e5e7eb"/></svg>'

export default function AvatarUpload({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState<SettingsActionState, FormData>(uploadAvatar, null)
  return (
    <form action={action} className="flex flex-wrap items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current || PLACEHOLDER}
        alt="Ảnh đại diện"
        className="size-16 rounded-full border border-border object-cover"
      />
      <div className="space-y-2">
        <input
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          required
          className="block text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:py-1.5 file:text-sm"
        />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? 'Đang tải…' : 'Cập nhật ảnh'}
        </Button>
        {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
        {state?.ok && <p className="text-xs text-primary">Đã cập nhật ảnh.</p>}
      </div>
    </form>
  )
}
