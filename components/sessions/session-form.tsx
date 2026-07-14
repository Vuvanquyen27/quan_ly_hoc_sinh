'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { saveSession, type SessionActionState } from '@/server/sessions/actions'
import type { SessionRow } from '@/server/sessions/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SESSION_MODES, MODE_LABEL } from '@/lib/validators/session'
import { utcToVnLocal } from '@/lib/datetime'

type StudentOpt = { id: string; label: string; defaultFee: number }
type Option = { id: string; label: string }

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'

function Field({ label, name, children }: { label: string; name?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

export default function SessionForm({
  session,
  students,
  lessons,
}: {
  session?: SessionRow
  students: StudentOpt[]
  lessons: Option[]
}) {
  const [state, action, pending] = useActionState<SessionActionState, FormData>(saveSession, null)
  const [fee, setFee] = useState<string>(session ? String(session.fee_amount) : '')

  return (
    <form action={action} className="space-y-5">
      {session && <input type="hidden" name="id" value={session.id} />}
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Học sinh *" name="studentId">
          <select
            id="studentId" name="studentId" required
            defaultValue={session?.student_id ?? ''}
            className={selectClass}
            onChange={(e) => {
              const s = students.find((x) => x.id === e.target.value)
              if (s && !fee) setFee(String(s.defaultFee))
            }}
          >
            <option value="">— Chọn học sinh —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>

        <Field label="Bài học (tùy chọn)" name="lessonId">
          <select id="lessonId" name="lessonId" defaultValue={session?.lesson_id ?? ''} className={selectClass}>
            <option value="">— Không —</option>
            {lessons.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </Field>

        <Field label="Bắt đầu *" name="startTime">
          <Input id="startTime" type="datetime-local" name="startTime" required
            defaultValue={session ? utcToVnLocal(session.start_time) : ''} />
        </Field>
        <Field label="Kết thúc *" name="endTime">
          <Input id="endTime" type="datetime-local" name="endTime" required
            defaultValue={session ? utcToVnLocal(session.end_time) : ''} />
        </Field>

        <Field label="Hình thức" name="mode">
          <select id="mode" name="mode" defaultValue={session?.mode ?? 'offline'} className={selectClass}>
            {SESSION_MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
          </select>
        </Field>
        <Field label="Học phí (VND)" name="feeAmount">
          <Input id="feeAmount" name="feeAmount" inputMode="numeric"
            value={fee} onChange={(e) => setFee(e.target.value)}
            placeholder="Để trống = lấy học phí mặc định của học sinh" />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Địa điểm / link online" name="location">
            <Input id="location" name="location" defaultValue={session?.location ?? ''} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Tiêu đề (tùy chọn)" name="title">
            <Input id="title" name="title" defaultValue={session?.title ?? ''} placeholder="vd: Ôn tập chương 3" />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Đang lưu…' : session ? 'Lưu thay đổi' : 'Thêm buổi'}
        </Button>
        <Link href="/lich-day" className="text-sm text-muted-foreground hover:underline">Hủy</Link>
      </div>
    </form>
  )
}
