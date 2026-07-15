'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { profileSchema, settingsSchema } from '@/lib/validators/settings'

export type SettingsActionState = { error?: string; ok?: boolean } | null

async function requireWritable(): Promise<{ error: string } | null> {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/dang-nhap')
  if (isReadOnly(ctx)) {
    return { error: 'Tài khoản đang ở chế độ chỉ đọc (thuê bao hết hạn hoặc bị khóa).' }
  }
  return null
}

/** Cập nhật hồ sơ — CHỈ full_name/phone (whitelist; không đụng role/is_locked/avatar). */
export async function updateProfile(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const guard = await requireWritable()
  if (guard) return guard
  const parsed = profileSchema.safeParse({
    fullName: String(formData.get('fullName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap')
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: (d.fullName ?? '').trim() || null, phone: (d.phone ?? '').trim() || null })
    .eq('id', user.id)
  if (error) return { error: 'Không lưu được hồ sơ.' }
  revalidatePath('/cai-dat')
  return { ok: true }
}

/** Cập nhật tùy chọn user_settings. */
export async function updateSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const guard = await requireWritable()
  if (guard) return guard
  const parsed = settingsSchema.safeParse({
    currency: String(formData.get('currency') ?? 'VND'),
    timezone: String(formData.get('timezone') ?? 'Asia/Ho_Chi_Minh'),
    dateFormat: String(formData.get('dateFormat') ?? 'dd/MM/yyyy'),
    defaultSessionDurationMin: String(formData.get('defaultSessionDurationMin') ?? '90'),
    notifySessionReminder: formData.get('notifySessionReminder') === 'on',
    notifyPaymentDue: formData.get('notifyPaymentDue') === 'on',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap')
  const { error } = await supabase
    .from('user_settings')
    .update({
      currency: d.currency,
      timezone: d.timezone,
      date_format: d.dateFormat,
      default_session_duration_min: d.defaultSessionDurationMin,
      notify_session_reminder: d.notifySessionReminder,
      notify_payment_due: d.notifyPaymentDue,
    })
    .eq('user_id', user.id)
  if (error) return { error: 'Không lưu được tùy chọn.' }
  revalidatePath('/cai-dat')
  return { ok: true }
}

const AVATAR_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** Upload ảnh đại diện → avatars/{uid}/avatar.<ext> → set profiles.avatar_url. */
export async function uploadAvatar(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const guard = await requireWritable()
  if (guard) return guard
  const file = formData.get('avatar')
  if (!(file instanceof File) || file.size === 0) return { error: 'Chưa chọn ảnh.' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Ảnh vượt quá 2MB.' }
  const ext = AVATAR_TYPES[file.type]
  if (!ext) return { error: 'Chỉ nhận ảnh JPEG/PNG/WebP.' }

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap')
  const path = `${user.id}/avatar.${ext}`
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type, upsert: true })
  if (upErr) return { error: 'Không tải được ảnh: ' + upErr.message }
  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${pub.publicUrl}?v=${Date.now()}`
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
  if (error) return { error: 'Không lưu được ảnh đại diện.' }
  revalidatePath('/cai-dat')
  return { ok: true }
}
