import { describe, it, expect } from 'vitest'
import { vnLocalToUtc, utcToVnLocal, rangeFor } from './datetime'

describe('vnLocalToUtc / utcToVnLocal', () => {
  it('đổi giờ VN sang UTC (trừ 7 giờ)', () => {
    expect(vnLocalToUtc('2026-07-14T09:00')).toBe('2026-07-14T02:00:00.000Z')
  })
  it('đổi UTC sang giờ VN datetime-local', () => {
    expect(utcToVnLocal('2026-07-14T02:00:00.000Z')).toBe('2026-07-14T09:00')
  })
  it('khứ hồi giữ nguyên', () => {
    const local = '2026-12-31T23:30'
    expect(utcToVnLocal(vnLocalToUtc(local))).toBe(local)
  })
})

describe('rangeFor', () => {
  it('view=day: đúng 1 ngày VN (00:00→24:00) theo UTC', () => {
    const { fromIso, toIso } = rangeFor('day', '2026-07-14')
    expect(fromIso).toBe('2026-07-13T17:00:00.000Z') // 14/07 00:00 VN = 13/07 17:00 UTC
    expect(toIso).toBe('2026-07-14T17:00:00.000Z')
  })
  it('view=week: bắt đầu Thứ Hai của tuần chứa ngày đó', () => {
    // 2026-07-14 là Thứ Ba → Thứ Hai là 2026-07-13
    const { fromIso, toIso } = rangeFor('week', '2026-07-14')
    expect(fromIso).toBe('2026-07-12T17:00:00.000Z') // 13/07 00:00 VN
    expect(toIso).toBe('2026-07-19T17:00:00.000Z')   // +7 ngày
  })
})
