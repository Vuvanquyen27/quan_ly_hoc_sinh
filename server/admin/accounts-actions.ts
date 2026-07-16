'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin, writeAudit } from '@/lib/admin'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { accountUpdateSchema } from '@/lib/validators/admin'

export type AccountActionState = { error?: string; ok?: boolean } | null

function revalidateAccount(userId: string) {
  revalidatePath('/admin/tai-khoan')
  revalidatePath(`/admin/tai-khoan/${userId}`)
}

/** Khóa tài khoản: profiles.is_locked = true + audit lock_account. */
export async function lockAccount(formData: FormData): Promise<void> {
  const actor = await assertAdmin()
  const userId = String(formData.get('userId') ?? '')
  if (!userId) return

  const admin = createAdminSupabase()
  const { error } = await admin.from('profiles').update({ is_locked: true }).eq('id', userId)
  if (error) return
  await writeAudit({ actorId: actor.id, action: 'lock_account', targetUserId: userId })
  revalidateAccount(userId)
}

/** Mở khóa tài khoản: profiles.is_locked = false + audit unlock_account. */
export async function unlockAccount(formData: FormData): Promise<void> {
  const actor = await assertAdmin()
  const userId = String(formData.get('userId') ?? '')
  if (!userId) return

  const admin = createAdminSupabase()
  const { error } = await admin.from('profiles').update({ is_locked: false }).eq('id', userId)
  if (error) return
  await writeAudit({ actorId: actor.id, action: 'unlock_account', targetUserId: userId })
  revalidateAccount(userId)
}

/** Sửa thông tin tài khoản (whitelist full_name/phone) + audit update_account. */
export async function updateAccount(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const actor = await assertAdmin()
  const userId = String(formData.get('userId') ?? '')
  if (!userId) return { error: 'Thiếu mã tài khoản.' }

  const parsed = accountUpdateSchema.safeParse({
    fullName: String(formData.get('fullName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const admin = createAdminSupabase()
  const { error } = await admin
    .from('profiles')
    .update({
      full_name: (d.fullName ?? '').trim() || null,
      phone: (d.phone ?? '').trim() || null,
    })
    .eq('id', userId)
  if (error) return { error: 'Không lưu được thông tin tài khoản.' }

  await writeAudit({
    actorId: actor.id,
    action: 'update_account',
    targetUserId: userId,
    metadata: { full_name: d.fullName ?? null, phone: d.phone ?? null },
  })
  revalidateAccount(userId)
  return { ok: true }
}
