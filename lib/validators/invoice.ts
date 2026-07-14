import { z } from 'zod'

export const INVOICE_STATUSES = ['draft', 'unpaid', 'partial', 'paid', 'overdue', 'cancelled'] as const

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  unpaid: 'Chưa thu',
  partial: 'Thu một phần',
  paid: 'Đã thu đủ',
  overdue: 'Quá hạn',
  cancelled: 'Đã hủy',
}

export const previewParamsSchema = z.object({
  studentId: z.string().trim().min(1, 'Vui lòng chọn học sinh'),
  periodMonth: z.string().trim().min(1, 'Vui lòng chọn kỳ (tháng)'),
})

export const manualInvoiceSchema = z.object({
  studentId: z.string().trim().min(1, 'Vui lòng chọn học sinh'),
  title: z.string().optional(),
  totalAmount: z.coerce.number().int('Số tiền phải là số nguyên').min(0, 'Số tiền không được âm'),
  dueDate: z.string().optional(),
})

export type ManualInvoiceInput = z.infer<typeof manualInvoiceSchema>
export type PreviewParams = z.infer<typeof previewParamsSchema>
