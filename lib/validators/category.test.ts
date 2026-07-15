import { describe, it, expect } from 'vitest'
import { categorySchema } from './category'

describe('category validator', () => {
  it('hợp lệ', () => {
    expect(categorySchema.safeParse({ kind: 'expense', name: 'Thuê phòng' }).success).toBe(true)
  })
  it('từ chối tên trống', () => {
    expect(categorySchema.safeParse({ kind: 'income', name: '  ' }).success).toBe(false)
  })
  it('từ chối kind lạ', () => {
    expect(categorySchema.safeParse({ kind: 'x', name: 'A' }).success).toBe(false)
  })
})
