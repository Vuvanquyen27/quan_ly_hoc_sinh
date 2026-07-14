import { describe, it, expect } from 'vitest'
import { manualInvoiceSchema, previewParamsSchema } from './invoice'

describe('invoice validators', () => {
  it('manual hợp lệ', () => {
    expect(manualInvoiceSchema.safeParse({ studentId: 's', totalAmount: 500000 }).success).toBe(true)
  })

  it('manual từ chối total âm', () => {
    expect(manualInvoiceSchema.safeParse({ studentId: 's', totalAmount: -1 }).success).toBe(false)
  })

  it('manual từ chối thiếu studentId', () => {
    expect(manualInvoiceSchema.safeParse({ studentId: '', totalAmount: 1000 }).success).toBe(false)
  })

  it('preview cần studentId', () => {
    expect(previewParamsSchema.safeParse({ studentId: '', periodMonth: '2026-07' }).success).toBe(false)
  })

  it('preview hợp lệ', () => {
    expect(previewParamsSchema.safeParse({ studentId: 's', periodMonth: '2026-07' }).success).toBe(true)
  })
})
