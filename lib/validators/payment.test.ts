import { describe, it, expect } from 'vitest'
import { paymentSchema } from './payment'

describe('paymentSchema', () => {
  it('hợp lệ', () => {
    expect(paymentSchema.safeParse({ invoiceId: 'i', amount: 100000, method: 'cash' }).success).toBe(true)
  })

  it('từ chối amount 0', () => {
    expect(paymentSchema.safeParse({ invoiceId: 'i', amount: 0, method: 'cash' }).success).toBe(false)
  })

  it('từ chối method sai', () => {
    expect(paymentSchema.safeParse({ invoiceId: 'i', amount: 1, method: 'x' }).success).toBe(false)
  })

  it('từ chối thiếu invoiceId', () => {
    expect(paymentSchema.safeParse({ invoiceId: '', amount: 1, method: 'cash' }).success).toBe(false)
  })
})
