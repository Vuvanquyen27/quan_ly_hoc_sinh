// Việt Nam cố định UTC+7 (không có giờ mùa DST).
const VN_OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** 'YYYY-MM-DDTHH:mm' (giờ VN) → UTC ISO string. */
export function vnLocalToUtc(local: string): string {
  return new Date(local.slice(0, 16) + ':00+07:00').toISOString()
}

/** UTC ISO → 'YYYY-MM-DDTHH:mm' (giờ VN, dùng cho datetime-local). */
export function utcToVnLocal(iso: string): string {
  return new Date(new Date(iso).getTime() + VN_OFFSET_MS).toISOString().slice(0, 16)
}

/** Khoảng UTC [fromIso, toIso) cho một mốc ngày VN 'YYYY-MM-DD' theo chế độ xem. */
export function rangeFor(
  view: 'list' | 'day' | 'week',
  dateStr: string,
): { fromIso: string; toIso: string } {
  const base = new Date(dateStr + 'T00:00:00+07:00') // 00:00 VN của ngày đó
  if (view === 'day') {
    return { fromIso: base.toISOString(), toIso: new Date(base.getTime() + DAY_MS).toISOString() }
  }
  if (view === 'week') {
    const vnShifted = new Date(base.getTime() + VN_OFFSET_MS) // để getUTCDay = thứ trong tuần VN
    const dow = vnShifted.getUTCDay() // 0=CN..6=T7
    const sinceMonday = (dow + 6) % 7
    const monday = new Date(base.getTime() - sinceMonday * DAY_MS)
    return { fromIso: monday.toISOString(), toIso: new Date(monday.getTime() + 7 * DAY_MS).toISOString() }
  }
  // list: 30 ngày tới kể từ mốc
  return { fromIso: base.toISOString(), toIso: new Date(base.getTime() + 30 * DAY_MS).toISOString() }
}
