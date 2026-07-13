import { z } from 'zod'

export const LESSON_STATUSES = ['draft', 'published'] as const

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  published: 'Đã xuất bản',
}

export const lessonSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề bài học'),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  tags: z.string().optional(),
  status: z.enum(LESSON_STATUSES),
})

export type LessonInput = z.infer<typeof lessonSchema>
