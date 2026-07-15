import { describe, it, expect } from 'vitest'
import { lastNMonths, monthLabel } from './reports'

describe('reports helper', () => {
  it('lastNMonths trả n tháng liên tục kết thúc endYM', () => {
    expect(lastNMonths(3, '2026-01')).toEqual(['2025-11', '2025-12', '2026-01'])
  })
  it('lastNMonths qua năm', () => {
    expect(lastNMonths(2, '2026-02')).toEqual(['2026-01', '2026-02'])
  })
  it('monthLabel định dạng MM/YY', () => {
    expect(monthLabel('2026-07')).toBe('07/26')
  })
})
