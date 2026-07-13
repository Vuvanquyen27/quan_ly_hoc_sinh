import { describe, it, expect } from 'vitest'
import { formatVND, formatDate, formatDateTime } from './format'

describe('formatVND', () => {
  it('định dạng số nguyên đồng VND', () => {
    expect(formatVND(1500000)).toBe('1.500.000 ₫')
  })
  it('0 đồng', () => {
    expect(formatVND(0)).toBe('0 ₫')
  })
  it('không có phần thập phân', () => {
    expect(formatVND(99000)).toBe('99.000 ₫')
  })
})

describe('formatDate', () => {
  it('định dạng dd/MM/yyyy theo Asia/Ho_Chi_Minh', () => {
    // 2026-07-13T12:00:00Z = 19:00 giờ VN cùng ngày
    expect(formatDate('2026-07-13T12:00:00Z')).toBe('13/07/2026')
  })
  it('mốc UTC tối muộn vẫn đúng ngày VN', () => {
    // 2026-07-13T18:00:00Z = 01:00 ngày 14/07 giờ VN
    expect(formatDate('2026-07-13T18:00:00Z')).toBe('14/07/2026')
  })
})

describe('formatDateTime', () => {
  it('định dạng dd/MM/yyyy HH:mm 24h theo giờ VN', () => {
    expect(formatDateTime('2026-07-13T12:30:00Z')).toBe('13/07/2026 19:30')
  })
})
