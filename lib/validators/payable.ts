import { z } from 'zod'

export const PAYABLE_STATUSES = ['unpaid', 'partial', 'paid', 'cancelled'] as const

export const PAYABLE_STATUS_LABEL: Record<string, string> = {
  unpaid: 'Chưa trả',
  partial: 'Trả một phần',
  paid: 'Đã trả đủ',
  cancelled: 'Đã hủy',
}

export const payableSchema = z.object({
  creditorName: z.string().optional(),
  title: z.string().optional(),
  categoryId: z.string().optional(),
  totalAmount: z.coerce.number().int('Số tiền phải là số nguyên').min(0, 'Số tiền không được âm'),
  dueDate: z.string().optional(),
  note: z.string().optional(),
})

export type PayableInput = z.infer<typeof payableSchema>
