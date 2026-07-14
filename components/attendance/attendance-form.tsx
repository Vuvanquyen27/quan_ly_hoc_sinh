'use client'

import { useActionState } from 'react'
import { saveAttendance, type AttendanceActionState } from '@/server/attendance/actions'
import type { AttendanceRow } from '@/server/attendance/queries'
import { Button } from '@/components/ui/button'
import { ATTENDANCE_STATUSES, ATTENDANCE_STATUS_LABEL } from '@/lib/validators/attendance'

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

export default function AttendanceForm({
  sessionId,
  attendance,
}: {
  sessionId: string
  attendance: AttendanceRow | null
}) {
  const [state, action, pending] = useActionState<AttendanceActionState, FormData>(saveAttendance, null)
  const hw = attendance?.homework_done
  const hwValue = hw === true ? 'true' : hw === false ? 'false' : ''

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="sessionId" value={sessionId} />
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Điểm danh *" name="status">
          <select id="status" name="status" required defaultValue={attendance?.status ?? ''} className={selectClass}>
            <option value="">— Chọn —</option>
            {ATTENDANCE_STATUSES.map((s) => (
              <option key={s} value={s}>{ATTENDANCE_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </Field>

        <Field label="Bài tập" name="homeworkDone">
          <select id="homeworkDone" name="homeworkDone" defaultValue={hwValue} className={selectClass}>
            <option value="">Không ghi nhận</option>
            <option value="true">Đã làm</option>
            <option value="false">Chưa làm</option>
          </select>
        </Field>
      </div>

      <Field label="Nhận xét sau buổi" name="note">
        <textarea
          id="note" name="note" rows={3} defaultValue={attendance?.note ?? ''}
          placeholder="Đã dạy gì, đánh giá, việc cần làm…"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </Field>

      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Đang lưu…' : 'Lưu điểm danh'}
      </Button>
    </form>
  )
}
