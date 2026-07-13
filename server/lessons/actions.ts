'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { lessonSchema } from '@/lib/validators/lesson'

export type LessonActionState = { error?: string } | null

async function requireWritable(): Promise<{ error: string } | null> {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/dang-nhap')
  if (isReadOnly(ctx)) {
    return { error: 'Tài khoản đang ở chế độ chỉ đọc (thuê bao hết hạn hoặc bị khóa).' }
  }
  return null
}

function readForm(formData: FormData) {
  return {
    title: String(formData.get('title') ?? ''),
    subject: String(formData.get('subject') ?? ''),
    gradeLevel: String(formData.get('gradeLevel') ?? ''),
    description: String(formData.get('description') ?? ''),
    content: String(formData.get('content') ?? ''),
    tags: String(formData.get('tags') ?? ''),
    status: String(formData.get('status') ?? 'draft'),
  }
}

function toRow(d: ReturnType<typeof lessonSchema.parse>) {
  return {
    title: d.title,
    subject: d.subject || null,
    grade_level: d.gradeLevel || null,
    description: d.description || null,
    content: d.content || null,
    tags: d.tags ? d.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
    status: d.status,
  }
}

/** Tạo hoặc cập nhật bài học (dựa vào field ẩn `id`). */
export async function saveLesson(
  _prev: LessonActionState,
  formData: FormData,
): Promise<LessonActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = lessonSchema.safeParse(readForm(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createServerSupabase()
  const id = formData.get('id') ? String(formData.get('id')) : null
  const row = toRow(parsed.data)

  if (id) {
    // RLS đảm bảo chỉ sửa được bài học của chính mình.
    const { error } = await supabase.from('lessons').update(row).eq('id', id)
    if (error) return { error: 'Không cập nhật được bài học.' }
  } else {
    // Không truyền user_id — CSDL đặt mặc định auth.uid().
    const { error } = await supabase.from('lessons').insert(row)
    if (error) return { error: 'Không lưu được bài học.' }
  }

  revalidatePath('/bai-hoc')
  redirect('/bai-hoc')
}

/** Lưu trữ (xóa mềm) bài học. */
export async function archiveLessonAction(formData: FormData): Promise<void> {
  const guard = await requireWritable()
  if (guard) return
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createServerSupabase()
  await supabase.from('lessons').update({ archived_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/bai-hoc')
  redirect('/bai-hoc')
}
