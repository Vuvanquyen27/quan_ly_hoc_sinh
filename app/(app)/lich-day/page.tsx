import { Suspense } from 'react'
import Link from 'next/link'
import { listSessions } from '@/server/sessions/queries'
import { rangeFor, todayVnDate } from '@/lib/datetime'
import { CalendarView } from '@/components/calendar/calendar-view'
import { buttonVariants } from '@/components/ui/button'

type CalView = 'list' | 'day' | 'week'

const VIEWS: { key: CalView; label: string }[] = [
  { key: 'day', label: 'Ngày' },
  { key: 'week', label: 'Tuần' },
  { key: 'list', label: 'Danh sách' },
]

function shiftDate(dateStr: string, view: string, dir: number): string {
  const days = view === 'day' ? 1 : view === 'week' ? 7 : 30
  const d = new Date(dateStr + 'T00:00:00+07:00')
  return new Date(d.getTime() + dir * days * 86400000).toISOString().slice(0, 10)
}

export default async function LichDayPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>
}) {
  const sp = await searchParams
  const view = (['list', 'day', 'week'].includes(sp.view ?? '') ? sp.view : 'week') as CalView
  const today = todayVnDate()
  const date = sp.date ?? today

  const hrefFor = (v: string, dt: string) => `/lich-day?view=${v}&date=${dt}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Lịch dạy</h1>
        <Link href="/lich-day/moi" className={buttonVariants({ variant: 'success' })}>+ Thêm buổi</Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {VIEWS.map((v) => (
            <Link key={v.key} href={hrefFor(v.key, date)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                view === v.key ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {v.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link href={hrefFor(view, shiftDate(date, view, -1))} className="rounded-lg border border-border px-3 py-1.5">◀</Link>
          <Link href={hrefFor(view, today)} className="rounded-lg border border-border px-3 py-1.5">Hôm nay</Link>
          <Link href={hrefFor(view, shiftDate(date, view, 1))} className="rounded-lg border border-border px-3 py-1.5">▶</Link>
        </div>
      </div>

      {/* Chỉ khối lịch chờ query — header + thanh điều hướng hiện ngay. */}
      <Suspense
        key={`${view}:${date}`}
        fallback={<div className="h-[60vh] animate-pulse rounded-lg bg-card" aria-busy="true" aria-label="Đang tải lịch" />}
      >
        <SessionsCalendar view={view} date={date} />
      </Suspense>
    </div>
  )
}

async function SessionsCalendar({ view, date }: { view: CalView; date: string }) {
  const { fromIso, toIso } = rangeFor(view, date)
  const sessions = await listSessions({ fromIso, toIso })
  return <CalendarView view={view} sessions={sessions} />
}
