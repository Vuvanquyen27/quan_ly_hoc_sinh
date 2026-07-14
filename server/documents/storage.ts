import { createServerSupabase } from '@/lib/supabase/server'
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/validators/document'

const BUCKET = 'documents'

export type UploadResult = {
  storagePath: string
  fileName: string
  fileSize: number
  mimeType: string
}

/** Upload tệp vào documents/{userId}/{docId}/{filename}. Ném lỗi tiếng Việt nếu quá cỡ / sai định dạng. */
export async function uploadDocumentFile(
  file: File,
  userId: string,
  docId: string,
): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) throw new Error('Tệp vượt quá 10MB.')
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new Error('Định dạng tệp không được hỗ trợ.')
  }
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const storagePath = `${userId}/${docId}/${safeName}`

  const supabase = await createServerSupabase()
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error('Không tải được tệp lên: ' + error.message)

  return { storagePath, fileName: file.name, fileSize: file.size, mimeType: file.type }
}

/** Tạo signed URL ngắn hạn để xem/tải tệp. */
export async function createDocumentSignedUrl(
  storagePath: string,
  expiresIn = 60,
): Promise<string | null> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn)
  if (error) console.error('createDocumentSignedUrl lỗi:', storagePath, error.message)
  return data?.signedUrl ?? null
}

/** Gỡ object khỏi Storage (dùng khi xóa tài liệu). */
export async function removeDocumentFile(storagePath: string): Promise<void> {
  const supabase = await createServerSupabase()
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath])
  if (error) console.error('removeDocumentFile lỗi:', storagePath, error.message)
}
