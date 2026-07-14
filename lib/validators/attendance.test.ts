import { describe, it, expect } from 'vitest'
import { attendanceSchema } from './attendance'

describe('attendanceSchema', () => {
  it('chấp nhận điểm danh hợp lệ', () => {
    const r = attendanceSchema.safeParse({ sessionId: 's1', status: 'present', homeworkDone: 'true', note: 'ok' })
    expect(r.success).toBe(true)
  })

  it('từ chối khi thiếu sessionId', () => {
    const r = attendanceSchema.safeParse({ sessionId: '', status: 'present' })
    expect(r.success).toBe(false)
  })

  it('từ chối status không hợp lệ', () => {
    const r = attendanceSchema.safeParse({ sessionId: 's1', status: 'xxx' })
    expect(r.success).toBe(false)
  })

  it('cho phép bỏ trống homeworkDone và note', () => {
    const r = attendanceSchema.safeParse({ sessionId: 's1', status: 'absent' })
    expect(r.success).toBe(true)
  })
})
