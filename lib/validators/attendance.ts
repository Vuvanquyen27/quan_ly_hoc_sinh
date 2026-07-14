import { z } from 'zod'

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const

export const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
  present: 'Có mặt',
  absent: 'Vắng',
  late: 'Đi trễ',
  excused: 'Có phép',
}

export const attendanceSchema = z.object({
  sessionId: z.string().trim().min(1, 'Thiếu buổi học'),
  status: z.enum(ATTENDANCE_STATUSES),
  homeworkDone: z.enum(['', 'true', 'false']).optional(),
  note: z.string().optional(),
})

export type AttendanceInput = z.infer<typeof attendanceSchema>
