import { z } from 'zod'

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'e_wallet', 'other'] as const

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  e_wallet: 'Ví điện tử',
  other: 'Khác',
}

export const paymentSchema = z.object({
  invoiceId: z.string().trim().min(1, 'Thiếu hóa đơn'),
  amount: z.coerce.number().int('Số tiền phải là số nguyên').positive('Số tiền phải lớn hơn 0'),
  method: z.enum(PAYMENT_METHODS),
  occurredAt: z.string().optional(),
  reference: z.string().optional(),
})

export type PaymentInput = z.infer<typeof paymentSchema>
