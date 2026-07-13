'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { saveLesson, type LessonActionState } from '@/server/lessons/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Lesson } from '@/server/lessons/queries'
import { LESSON_STATUSES, STATUS_LABEL } from '@/lib/validators/lesson'

function Field({
  label, name, children,
}: { label: string; name?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'

export function LessonForm({ lesson }: { lesson?: Lesson }) {
  const [state, action, pending] = useActionState<LessonActionState, FormData>(saveLesson, null)

  return (
    <form action={action} className="space-y-5">
      {lesson && <input type="hidden" name="id" value={lesson.id} />}
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Tiêu đề *" name="title">
            <Input id="title" name="title" required defaultValue={lesson?.title ?? ''} placeholder="Hàm số bậc hai" />
          </Field>
        </div>

        <Field label="Môn" name="subject">
          <Input id="subject" name="subject" defaultValue={lesson?.subject ?? ''} placeholder="Toán" />
        </Field>
        <Field label="Khối / lớp" name="gradeLevel">
          <Input id="gradeLevel" name="gradeLevel" defaultValue={lesson?.grade_level ?? ''} placeholder="Lớp 9" />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Mô tả ngắn" name="description">
            <Input id="description" name="description" defaultValue={lesson?.description ?? ''} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Nội dung (Markdown)" name="content">
            <textarea id="content" name="content" rows={12} defaultValue={lesson?.content ?? ''}
              placeholder="# Mục tiêu bài học…"
              className={selectClass + ' h-auto py-2 font-mono'} />
          </Field>
        </div>

        <Field label="Tag (phẩy để ngăn cách)" name="tags">
          <Input id="tags" name="tags" defaultValue={lesson?.tags?.join(', ') ?? ''} placeholder="đại số, ôn thi" />
        </Field>
        <Field label="Trạng thái" name="status">
          <select id="status" name="status" defaultValue={lesson?.status ?? 'draft'} className={selectClass}>
            {LESSON_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Đang lưu…' : lesson ? 'Lưu thay đổi' : 'Thêm bài học'}
        </Button>
        <Link href="/bai-hoc" className="text-sm text-muted-foreground hover:underline">Hủy</Link>
      </div>
    </form>
  )
}
