import { z } from 'zod'

export const SESSION_STATUSES = ['scheduled', 'completed', 'cancelled'] as const
export const SESSION_MODES = ['online', 'offline'] as const

export const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Sắp diễn ra',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy',
}
export const MODE_LABEL: Record<string, string> = {
  online: 'Trực tuyến',
  offline: 'Trực tiếp',
}

export const sessionSchema = z
  .object({
    studentId: z.string().trim().min(1, 'Vui lòng chọn học sinh'),
    lessonId: z.string().optional(),
    title: z.string().optional(),
    startTime: z.string().trim().min(1, 'Vui lòng chọn giờ bắt đầu'),
    endTime: z.string().trim().min(1, 'Vui lòng chọn giờ kết thúc'),
    mode: z.enum(SESSION_MODES),
    location: z.string().optional(),
    feeAmount: z.coerce.number().int('Học phí phải là số nguyên').min(0, 'Học phí không được âm'),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: 'Giờ kết thúc phải sau giờ bắt đầu',
    path: ['endTime'],
  })

export type SessionInput = z.infer<typeof sessionSchema>
