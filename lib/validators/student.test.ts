import { describe, expect, it } from 'vitest'
import { studentSchema } from './student'

const base = {
  fullName: 'Nguyễn Văn A',
  defaultFee: '500000',
  feeType: 'per_session',
  status: 'active',
}

describe('studentSchema', () => {
  it('chấp nhận hồ sơ hợp lệ và ép học phí về số nguyên', () => {
    const r = studentSchema.safeParse(base)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.defaultFee).toBe(500000)
      expect(typeof r.data.defaultFee).toBe('number')
    }
  })

  it('từ chối khi thiếu họ tên', () => {
    const r = studentSchema.safeParse({ ...base, fullName: '   ' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Vui lòng nhập họ tên học sinh')
  })

  it('từ chối học phí âm', () => {
    const r = studentSchema.safeParse({ ...base, defaultFee: '-1' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Học phí không được âm')
  })

  it('từ chối học phí không phải số nguyên', () => {
    const r = studentSchema.safeParse({ ...base, defaultFee: '10.5' })
    expect(r.success).toBe(false)
  })

  it('từ chối trạng thái ngoài enum', () => {
    const r = studentSchema.safeParse({ ...base, status: 'unknown' })
    expect(r.success).toBe(false)
  })

  it('từ chối loại học phí ngoài enum', () => {
    const r = studentSchema.safeParse({ ...base, feeType: 'per_year' })
    expect(r.success).toBe(false)
  })
})
