import type { SessionRow } from '@/server/sessions/queries'
import { SessionCard } from './session-card'
import { formatDate } from '@/lib/format'
import { utcToVnLocal } from '@/lib/datetime'

function groupByDay(sessions: SessionRow[]): [string, SessionRow[]][] {
  const map = new Map<string, SessionRow[]>()
  for (const s of sessions) {
    const key = utcToVnLocal(s.start_time).slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return [...map.entries()]
}

export function CalendarView({ view, sessions }: { view: 'list' | 'day' | 'week'; sessions: SessionRow[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
        Chưa có buổi nào trong khoảng này.
      </div>
    )
  }
  if (view === 'day') {
    return <div className="space-y-3">{sessions.map((s) => <SessionCard key={s.id} session={s} />)}</div>
  }
  // list + week: nhóm theo ngày (week desktop có thể nâng cấp lưới sau; MVP hiển thị theo ngày)
  return (
    <div className="space-y-6">
      {groupByDay(sessions).map(([day, items]) => (
        <div key={day} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{formatDate(items[0].start_time)}</h3>
          {items.map((s) => <SessionCard key={s.id} session={s} />)}
        </div>
      ))}
    </div>
  )
}
