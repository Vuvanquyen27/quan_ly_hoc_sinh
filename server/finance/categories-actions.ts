'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { categorySchema } from '@/lib/validators/category'

export type FinanceCategoryActionState = { error?: string; ok?: boolean } | null

async function requireWritable(): Promise<{ error: string } | null> {
  const ctx = await getSessionContext()
  if (!ctx) return { error: 'Chưa đăng nhập.' }
  if (isReadOnly(ctx)) return { error: 'Tài khoản đang ở chế độ chỉ đọc.' }
  return null
}

/** Tạo danh mục (kind income/expense). */
export async function createCategory(
  _prev: FinanceCategoryActionState,
  formData: FormData,
): Promise<FinanceCategoryActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = categorySchema.safeParse({
    kind: String(formData.get('kind') ?? ''),
    name: String(formData.get('name') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('categories')
    .insert({ kind: parsed.data.kind, name: parsed.data.name })
  if (error) {
    return { error: error.code === '23505' ? 'Danh mục đã tồn tại.' : 'Không tạo được danh mục.' }
  }
  revalidatePath('/tai-chinh/danh-muc')
  return { ok: true }
}

/** Đổi tên danh mục. */
export async function updateCategory(
  _prev: FinanceCategoryActionState,
  formData: FormData,
): Promise<FinanceCategoryActionState> {
  const guard = await requireWritable()
  if (guard) return guard
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Thiếu mã danh mục.' }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Tên danh mục không được trống.' }

  const supabase = await createServerSupabase()
  const { error } = await supabase.from('categories').update({ name }).eq('id', id)
  if (error) {
    return { error: error.code === '23505' ? 'Danh mục đã tồn tại.' : 'Không cập nhật được danh mục.' }
  }
  revalidatePath('/tai-chinh/danh-muc')
  return { ok: true }
}

/** Lưu trữ (archive mềm) danh mục. */
export async function archiveCategoryAction(formData: FormData): Promise<void> {
  const guard = await requireWritable()
  if (guard) return
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createServerSupabase()
  const { error } = await supabase.from('categories').update({ is_archived: true }).eq('id', id)
  if (error) {
    console.error('archiveCategoryAction lỗi:', id, error.message)
    return
  }
  revalidatePath('/tai-chinh/danh-muc')
}
