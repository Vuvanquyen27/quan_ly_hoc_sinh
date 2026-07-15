import { describe, it, expect } from 'vitest'
import { settingsSchema, profileSchema } from './settings'

describe('settings validators', () => {
  it('profile chấp nhận rỗng', () => {
    expect(profileSchema.safeParse({}).success).toBe(true)
  })
  it('settings hợp lệ', () => {
    expect(settingsSchema.safeParse({
      currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', dateFormat: 'dd/MM/yyyy',
      defaultSessionDurationMin: 90, notifySessionReminder: true, notifyPaymentDue: false,
    }).success).toBe(true)
  })
  it('settings từ chối thời lượng ngoài biên', () => {
    expect(settingsSchema.safeParse({
      currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', dateFormat: 'dd/MM/yyyy',
      defaultSessionDurationMin: 5, notifySessionReminder: true, notifyPaymentDue: true,
    }).success).toBe(false)
  })
})
