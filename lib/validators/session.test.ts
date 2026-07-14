import { describe, it, expect } from 'vitest'
import { sessionSchema } from './session'

const base = {
  studentId: '11111111-1111-1111-1111-111111111111',
  startTime: '2026-07-14T09:00',
  endTime: '2026-07-14T10:30',
  mode: 'offline',
  feeAmount: '150000',
}

describe('sessionSchema', () => {
  it('chấp nhận buổi hợp lệ', () => {
    expect(sessionSchema.safeParse(base).success).toBe(true)
  })
  it('từ chối khi thiếu học sinh', () => {
    expect(sessionSchema.safeParse({ ...base, studentId: '' }).success).toBe(false)
  })
  it('từ chối khi giờ kết thúc <= giờ bắt đầu', () => {
    expect(sessionSchema.safeParse({ ...base, endTime: '2026-07-14T09:00' }).success).toBe(false)
  })
  it('từ chối học phí âm', () => {
    expect(sessionSchema.safeParse({ ...base, feeAmount: '-1' }).success).toBe(false)
  })
})
