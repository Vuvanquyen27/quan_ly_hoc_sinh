import { z } from 'zod'

export const STUDENT_STATUSES = ['active', 'paused', 'inactive'] as const
export const FEE_TYPES = ['per_session', 'per_month'] as const

export const STATUS_LABEL: Record<string, string> = {
  active: 'Đang học',
  paused: 'Tạm nghỉ',
  inactive: 'Đã nghỉ',
}
export const FEE_TYPE_LABEL: Record<string, string> = {
  per_session: 'Theo buổi',
  per_month: 'Theo tháng',
}

export const studentSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên học sinh'),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  gradeLevel: z.string().optional(),
  subjects: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
  defaultFee: z.coerce.number().int('Học phí phải là số nguyên').min(0, 'Học phí không được âm'),
  feeType: z.enum(FEE_TYPES),
  status: z.enum(STUDENT_STATUSES),
  notes: z.string().optional(),
})

export type StudentInput = z.infer<typeof studentSchema>
