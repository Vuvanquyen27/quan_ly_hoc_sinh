'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { saveDocument, type DocumentActionState } from '@/server/documents/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DocumentRow } from '@/server/documents/queries'
import { DOCUMENT_TYPES, TYPE_LABEL } from '@/lib/validators/document'

type Option = { id: string; label: string }

function Field({
  label,
  name,
  children,
}: {
  label: string
  name?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'

export default function DocumentForm({
  doc,
  lessons,
  students,
  defaultLessonId,
  defaultStudentId,
}: {
  doc?: DocumentRow
  lessons: Option[]
  students: Option[]
  defaultLessonId?: string
  defaultStudentId?: string
}) {
  const [state, action, pending] = useActionState<DocumentActionState, FormData>(
    saveDocument,
    null,
  )
  const [type, setType] = useState<string>(doc?.type ?? 'link')

  return (
    <form action={action} className="space-y-5">
      {doc?.id && <input type="hidden" name="id" value={doc.id} />}

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Field label="Tiêu đề *" name="title">
        <Input id="title" name="title" required defaultValue={doc?.title ?? ''} placeholder="Ví dụ: Đề kiểm tra 15 phút" />
      </Field>

      <Field label="Loại tài liệu">
        <div className="flex gap-6">
          {DOCUMENT_TYPES.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="accent-primary"
              />
              {TYPE_LABEL[t]}
            </label>
          ))}
        </div>
      </Field>

      {type === 'link' ? (
        <Field label="Liên kết (URL)" name="url">
          <Input
            id="url"
            name="url"
            type="url"
            defaultValue={doc?.url ?? ''}
            placeholder="https://…"
          />
        </Field>
      ) : (
        <Field label="Tệp (≤ 10MB)" name="file">
          <input
            id="file"
            type="file"
            name="file"
            className={selectClass + ' h-auto py-2'}
          />
          {doc?.file_name && (
            <p className="mt-1 text-xs text-muted-foreground">
              Hiện tại: {doc.file_name} (để trống nếu không đổi)
            </p>
          )}
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Gắn bài học" name="lessonId">
          <select
            id="lessonId"
            name="lessonId"
            defaultValue={doc?.lesson_id ?? defaultLessonId ?? ''}
            className={selectClass}
          >
            <option value="">— Không —</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Gắn học sinh" name="studentId">
          <select
            id="studentId"
            name="studentId"
            defaultValue={doc?.student_id ?? defaultStudentId ?? ''}
            className={selectClass}
          >
            <option value="">— Không —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Mô tả" name="description">
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={doc?.description ?? ''}
          placeholder="Mô tả ngắn về tài liệu…"
          className={selectClass + ' h-auto py-2'}
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Đang lưu…' : 'Lưu tài liệu'}
        </Button>
        <Link href="/tai-lieu" className="text-sm text-muted-foreground hover:underline">
          Hủy
        </Link>
      </div>
    </form>
  )
}
