import { describe, expect, it } from 'vitest'
import { lessonSchema } from './lesson'

const base = { title: 'Hàm số bậc hai', status: 'draft' }

describe('lessonSchema', () => {
  it('chấp nhận bài học hợp lệ', () => {
    const r = lessonSchema.safeParse(base)
    expect(r.success).toBe(true)
  })

  it('từ chối khi thiếu tiêu đề', () => {
    const r = lessonSchema.safeParse({ ...base, title: '   ' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Vui lòng nhập tiêu đề bài học')
  })

  it('từ chối trạng thái ngoài enum', () => {
    const r = lessonSchema.safeParse({ ...base, status: 'archived' })
    expect(r.success).toBe(false)
  })
})
