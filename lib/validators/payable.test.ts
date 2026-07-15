import { describe, it, expect } from 'vitest'
import { payableSchema } from './payable'

describe('payable validator', () => {
  it('hợp lệ với total ≥ 0', () => {
    expect(payableSchema.safeParse({ creditorName: 'Chủ nhà', totalAmount: 500000 }).success).toBe(true)
  })
  it('từ chối total âm', () => {
    expect(payableSchema.safeParse({ totalAmount: -1 }).success).toBe(false)
  })
  it('từ chối total không nguyên', () => {
    expect(payableSchema.safeParse({ totalAmount: 1.5 }).success).toBe(false)
  })
})
