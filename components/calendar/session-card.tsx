'use client'

import Link from 'next/link'
import { changeSessionStatus } from '@/server/sessions/actions'
import type { SessionRow } from '@/server/sessions/queries'
import { STATUS_LABEL } from '@/lib/validators/session'

function timeHM(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(iso))
}

export function SessionCard({ session: s }: { session: SessionRow }) {
  const overdue = s.status === 'scheduled' && new Date(s.end_time).getTime() < Date.now()
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/lich-day/${s.id}/sua`} className="font-medium text-foreground hover:underline">
          {timeHM(s.start_time)}–{timeHM(s.end_time)} · {s.student_name ?? 'Học sinh'}
        </Link>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
          {STATUS_LABEL[s.status] ?? s.status}
        </span>
      </div>
      {s.title && <p className="mt-1 text-sm text-muted-foreground">{s.title}</p>}
      {overdue && (
        <form action={changeSessionStatus} className="mt-2">
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="status" value="completed" />
          <button type="submit" className="text-xs text-primary hover:underline">
            Buổi đã quá giờ — đánh dấu hoàn thành
          </button>
        </form>
      )}
    </div>
  )
}
