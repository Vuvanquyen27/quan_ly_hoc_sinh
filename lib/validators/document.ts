import { z } from 'zod'

export const DOCUMENT_TYPES = ['file', 'link'] as const

export const TYPE_LABEL: Record<string, string> = {
  file: 'Tệp',
  link: 'Liên kết',
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
] as const

export const documentSchema = z
  .object({
    title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề tài liệu'),
    type: z.enum(DOCUMENT_TYPES),
    url: z.string().optional(),
    lessonId: z.string().optional(),
    studentId: z.string().optional(),
    description: z.string().optional(),
  })
  .refine((d) => d.type !== 'link' || (!!d.url && /^https?:\/\/.+/.test(d.url)), {
    message: 'Liên kết phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://)',
    path: ['url'],
  })

export type DocumentInput = z.infer<typeof documentSchema>
