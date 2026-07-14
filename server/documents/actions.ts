'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { documentSchema } from '@/lib/validators/document'
import {
  uploadDocumentFile,
  createDocumentSignedUrl,
  removeDocumentFile,
} from '@/server/documents/storage'

export type DocumentActionState = { error?: string } | null

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
    type: String(formData.get('type') ?? 'link'),
    url: String(formData.get('url') ?? ''),
    lessonId: String(formData.get('lessonId') ?? ''),
    studentId: String(formData.get('studentId') ?? ''),
    description: String(formData.get('description') ?? ''),
  }
}

/** Tạo hoặc cập nhật tài liệu (field ẩn `id`). */
export async function saveDocument(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = documentSchema.safeParse(readForm(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap')

  const id = formData.get('id') ? String(formData.get('id')) : null

  // Nếu là tệp và có tệp mới được chọn → upload trước.
  let fileMeta: Awaited<ReturnType<typeof uploadDocumentFile>> | null = null
  const file = formData.get('file')
  if (d.type === 'file' && file instanceof File && file.size > 0) {
    try {
      fileMeta = await uploadDocumentFile(file, user.id, randomUUID())
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Không tải được tệp lên.' }
    }
  }

  const row: Record<string, unknown> = {
    title: d.title,
    type: d.type,
    url: d.type === 'link' ? d.url : null,
    description: d.description || null,
    lesson_id: d.lessonId || null,
    student_id: d.studentId || null,
  }
  if (fileMeta) {
    row.storage_path = fileMeta.storagePath
    row.file_name = fileMeta.fileName
    row.file_size = fileMeta.fileSize
    row.mime_type = fileMeta.mimeType
  }

  if (id) {
    const { error } = await supabase.from('documents').update(row).eq('id', id)
    if (error) return { error: 'Không cập nhật được tài liệu.' }
  } else {
    if (d.type === 'file' && !fileMeta) return { error: 'Vui lòng chọn tệp để tải lên.' }
    // Không truyền user_id — CSDL đặt mặc định auth.uid().
    const { error } = await supabase.from('documents').insert(row)
    if (error) return { error: 'Không lưu được tài liệu.' }
  }

  revalidatePath('/tai-lieu')
  redirect('/tai-lieu')
}

/** Xóa cứng tài liệu + gỡ object Storage nếu có. */
export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const guard = await requireWritable()
  if (guard) return
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createServerSupabase()
  const { data } = await supabase.from('documents').select('storage_path').eq('id', id).maybeSingle()
  if (data?.storage_path) await removeDocumentFile(data.storage_path as string)
  await supabase.from('documents').delete().eq('id', id)

  revalidatePath('/tai-lieu')
  redirect('/tai-lieu')
}

/** Trả signed URL để mở/tải tệp (RLS chặn tài liệu của người khác). */
export async function getSignedUrlAction(id: string): Promise<string | null> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('documents').select('storage_path').eq('id', id).maybeSingle()
  if (!data?.storage_path) return null
  return createDocumentSignedUrl(data.storage_path as string, 60)
}
