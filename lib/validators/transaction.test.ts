import { describe, it, expect } from 'vitest'
import { transactionSchema } from './transaction'

describe('transaction validator', () => {
  it('thu hợp lệ', () => {
    expect(transactionSchema.safeParse({ type: 'income', amount: 100000, method: 'cash' }).success).toBe(true)
  })
  it('từ chối amount 0', () => {
    expect(transactionSchema.safeParse({ type: 'expense', amount: 0, method: 'cash' }).success).toBe(false)
  })
  it('từ chối type lạ', () => {
    expect(transactionSchema.safeParse({ type: 'x', amount: 1, method: 'cash' }).success).toBe(false)
  })
})
