import { z } from 'zod'

export const CURRENCIES = ['VND'] as const
export const TIMEZONES = ['Asia/Ho_Chi_Minh'] as const
export const DATE_FORMATS = ['dd/MM/yyyy', 'yyyy-MM-dd'] as const

export const profileSchema = z.object({
  fullName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
})

export const settingsSchema = z.object({
  currency: z.string().trim().min(1),
  timezone: z.string().trim().min(1),
  dateFormat: z.string().trim().min(1),
  defaultSessionDurationMin: z.coerce
    .number()
    .int('Phải là số nguyên')
    .min(15, 'Tối thiểu 15 phút')
    .max(600, 'Tối đa 600 phút'),
  notifySessionReminder: z.boolean(),
  notifyPaymentDue: z.boolean(),
})

export type ProfileInput = z.infer<typeof profileSchema>
export type SettingsInput = z.infer<typeof settingsSchema>
