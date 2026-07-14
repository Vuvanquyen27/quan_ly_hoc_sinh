import { describe, it, expect } from 'vitest'
import { documentSchema } from './document'

describe('documentSchema', () => {
  it('chấp nhận liên kết hợp lệ', () => {
    const r = documentSchema.safeParse({ title: 'Video bài giảng', type: 'link', url: 'https://youtu.be/abc' })
    expect(r.success).toBe(true)
  })

  it('từ chối liên kết thiếu url', () => {
    const r = documentSchema.safeParse({ title: 'X', type: 'link', url: '' })
    expect(r.success).toBe(false)
  })

  it('từ chối liên kết url sai định dạng', () => {
    const r = documentSchema.safeParse({ title: 'X', type: 'link', url: 'khong-phai-url' })
    expect(r.success).toBe(false)
  })

  it('chấp nhận tài liệu dạng tệp (không cần url)', () => {
    const r = documentSchema.safeParse({ title: 'Đề cương', type: 'file' })
    expect(r.success).toBe(true)
  })

  it('từ chối khi thiếu tiêu đề', () => {
    const r = documentSchema.safeParse({ title: '', type: 'link', url: 'https://a.b' })
    expect(r.success).toBe(false)
  })
})
