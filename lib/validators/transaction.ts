import { z } from 'zod'
import { PAYMENT_METHODS } from './payment'

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().int('Số tiền phải là số nguyên').positive('Số tiền phải lớn hơn 0'),
  categoryId: z.string().optional(),
  method: z.enum(PAYMENT_METHODS),
  occurredAt: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
})

export type TransactionInput = z.infer<typeof transactionSchema>
